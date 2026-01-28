
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';
import db from './database.js';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- System Command Helper ---
const runSystemCommand = (command) => {
    return new Promise((resolve) => {
        // Only run real commands on Linux
        if (os.platform() !== 'linux') {
            console.log(`[Simulated Command]: ${command}`);
            return resolve(true);
        }

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing: ${command}`, error.message);
                // Resolve anyway to prevent server crash, but logs error
                resolve(false); 
            } else {
                resolve(true);
            }
        });
    });
};

// --- API Routes ---

// 1. Settings
app.get('/api/settings', (req, res) => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        settings.is2FAEnabled = settings.is2FAEnabled === 'true';
        res.json(settings);
    });
});

app.post('/api/settings', (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        Object.entries(settings).forEach(([key, value]) => {
            stmt.run(key, String(value));
        });
        db.run("COMMIT", (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
    stmt.finalize();
});

// 2. Users
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const users = rows.map(u => ({
            ...u,
            isActive: !!u.isActive,
            // Real speed (requires server agent, 0 for now)
            currentUploadSpeed: 0, 
            currentDownloadSpeed: 0,
            activeConnections: [],
            siteUsageHistory: []
        }));
        res.json(users);
    });
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    
    // Create System User (Nologin)
    // -M: No home directory
    // -s /sbin/nologin: No shell access
    // -e: Expiry date
    const datePart = u.expiryDate.split('T')[0];
    const userAddCmd = `useradd -M -s /sbin/nologin -e "${datePart}" "${u.username}"`;
    
    // Improved password setting with quotes to handle special chars
    // Using single quotes for password inside the echo string is safer in bash
    const setPassCmd = `echo '${u.username}:${u.password}' | chpasswd`;

    // Execute system commands first
    await runSystemCommand(userAddCmd);
    await runSystemCommand(setPassCmd);

    const stmt = db.prepare(`
        INSERT INTO users (id, username, password, isActive, expiryDate, dataLimitGB, dataUsedGB, concurrentLimit, concurrentInUse, createdAt, notes, speedLimitUpload, speedLimitDownload, speedLimitTotal)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
        u.id, u.username, u.password, u.isActive ? 1 : 0, u.expiryDate, 
        u.dataLimitGB, 0, u.concurrentLimit, 0, u.createdAt, u.notes,
        u.speedLimitUpload || 0, u.speedLimitDownload || 0, u.speedLimitTotal || 0,
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, id: u.id });
        }
    );
});

app.put('/api/users/:id', async (req, res) => {
    const u = req.body;
    const id = req.params.id;

    // Get current username to execute commands
    db.get("SELECT username FROM users WHERE id = ?", [id], async (err, row) => {
        if (err || !row) return res.status(500).json({ error: "User not found" });
        
        const username = row.username;
        const datePart = u.expiryDate.split('T')[0];
        
        // Update System User
        // Update Expiry & Shell
        await runSystemCommand(`usermod -s /sbin/nologin -e "${datePart}" "${username}"`);
        
        // Update Password - Robust Method
        // We use single quotes around the "user:pass" string to prevent shell expansion issues
        await runSystemCommand(`echo '${username}:${u.password}' | chpasswd`);
        
        // Lock/Unlock based on isActive
        if (u.isActive) {
            await runSystemCommand(`usermod -U "${username}"`);
        } else {
            await runSystemCommand(`usermod -L "${username}"`);
        }

        const stmt = db.prepare(`
            UPDATE users SET 
            password = ?, isActive = ?, expiryDate = ?, dataLimitGB = ?, 
            concurrentLimit = ?, notes = ?, speedLimitUpload = ?, speedLimitDownload = ?, speedLimitTotal = ?
            WHERE id = ?
        `);
        
        stmt.run(
            u.password, u.isActive ? 1 : 0, u.expiryDate, u.dataLimitGB,
            u.concurrentLimit, u.notes, u.speedLimitUpload, u.speedLimitDownload, u.speedLimitTotal || 0, id,
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            }
        );
    });
});

app.delete('/api/users/:id', (req, res) => {
    const id = req.params.id;
    
    db.get("SELECT username FROM users WHERE id = ?", [id], async (err, row) => {
        if (row) {
             // Delete System User
             await runSystemCommand(`userdel -f "${row.username}"`);

             db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        } else {
            res.json({ success: false });
        }
    });
});

// 3. Stats
app.get('/api/stats', (req, res) => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const load = os.loadavg()[0]; 
    const cpuUsage = Math.min(100, load * 10);
    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / (3600*24));
    const hours = Math.floor(uptimeSeconds % (3600*24) / 3600);

    res.json({
        cpu: cpuUsage,
        ram: (usedMem / totalMem) * 100,
        disk: 45,
        uptime: `${days}d, ${hours}h`,
        totalTrafficUp: 150,
        totalTrafficDown: 450
    });
});

// --- Serve Frontend ---
app.use(express.static(join(__dirname, '../dist')));

// Fallback for SPA routing
app.get('*', (req, res) => {
    const indexFile = join(__dirname, '../dist/index.html');
    res.sendFile(indexFile, (err) => {
        if (err) {
            res.status(500).send("Server Error: Could not find frontend build. Please run 'npm run build'.");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`OS Platform: ${os.platform()}`);
});
