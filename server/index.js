import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from './database.js';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from React build
app.use(express.static(join(__dirname, '../dist')));

// --- API Routes ---

// 1. Get Settings & Login Check
app.get('/api/settings', (req, res) => {
    db.all("SELECT * FROM settings", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        // Convert boolean strings
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

// 2. User Management
app.get('/api/users', (req, res) => {
    db.all("SELECT * FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const users = rows.map(u => ({
            ...u,
            isActive: !!u.isActive,
            // Mocking live stats for now as they are memory-only
            currentUploadSpeed: 0,
            currentDownloadSpeed: 0,
            activeConnections: [],
            siteUsageHistory: []
        }));
        res.json(users);
    });
});

app.post('/api/users', (req, res) => {
    const u = req.body;
    const stmt = db.prepare(`
        INSERT INTO users (id, username, password, isActive, expiryDate, dataLimitGB, dataUsedGB, concurrentLimit, concurrentInUse, createdAt, notes, speedLimitUpload, speedLimitDownload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
        u.id, u.username, u.password, u.isActive ? 1 : 0, u.expiryDate, 
        u.dataLimitGB, 0, u.concurrentLimit, 0, u.createdAt, u.notes,
        u.speedLimitUpload || 0, u.speedLimitDownload || 0,
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // TODO: Execute system command: useradd -s /sbin/nologin ...
            res.json({ success: true, id: u.id });
        }
    );
});

app.put('/api/users/:id', (req, res) => {
    const u = req.body;
    const id = req.params.id;
    const stmt = db.prepare(`
        UPDATE users SET 
        password = ?, isActive = ?, expiryDate = ?, dataLimitGB = ?, 
        concurrentLimit = ?, notes = ?, speedLimitUpload = ?, speedLimitDownload = ?
        WHERE id = ?
    `);
    
    stmt.run(
        u.password, u.isActive ? 1 : 0, u.expiryDate, u.dataLimitGB,
        u.concurrentLimit, u.notes, u.speedLimitUpload, u.speedLimitDownload, id,
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            // TODO: Execute system command: usermod ...
            res.json({ success: true });
        }
    );
});

app.delete('/api/users/:id', (req, res) => {
    const id = req.params.id;
    // Get username first to delete system user
    db.get("SELECT username FROM users WHERE id = ?", [id], (err, row) => {
        if (row) {
             db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                // TODO: Execute system command: userdel row.username
                res.json({ success: true });
            });
        } else {
            res.json({ success: false });
        }
    });
});

// 3. System Stats (Real Data)
app.get('/api/stats', (req, res) => {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Simple load avg for CPU approximation
    const load = os.loadavg()[0]; 
    const cpuUsage = Math.min(100, load * 10); // Rough approximation for linux

    const uptimeSeconds = os.uptime();
    const days = Math.floor(uptimeSeconds / (3600*24));
    const hours = Math.floor(uptimeSeconds % (3600*24) / 3600);

    // Network Stats (Reading /proc/net/dev would be better on Linux, using mock increment for traffic)
    res.json({
        cpu: cpuUsage,
        ram: (usedMem / totalMem) * 100,
        disk: 45, // Needs 'check-disk-space' package for real data
        uptime: `${days} days, ${hours} hours`,
        totalTrafficUp: 150, // These would need persistent storage in DB to be real
        totalTrafficDown: 450
    });
});

// Handle React Routing
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});