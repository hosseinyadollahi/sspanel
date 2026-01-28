
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
        if (os.platform() !== 'linux') {
            return resolve({ stdout: '', success: true }); 
        }

        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                resolve({ stdout: '', stderr, success: false });
            } else {
                resolve({ stdout, success: true });
            }
        });
    });
};

// --- GeoIP Service ---
const geoCache = new Map();
const resolveGeo = async (ip) => {
    const cleanIp = ip.replace('::ffff:', '');
    
    // Private IPs
    if (cleanIp === '127.0.0.1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.') || cleanIp === '::1') {
        return { country: 'Local', countryCode: 'LO', city: 'Server' };
    }

    if (geoCache.has(cleanIp)) {
        return geoCache.get(cleanIp);
    }

    try {
        // Using ip-api.com
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5s timeout

        const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,city`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success') {
                const geoData = {
                    country: data.country,
                    countryCode: data.countryCode,
                    city: data.city
                };
                geoCache.set(cleanIp, geoData);
                return geoData;
            }
        }
    } catch (e) {
        // console.error("GeoIP Fetch Error:", e.message);
    }
    
    // Cache failures briefly to prevent spam
    const unknown = { country: 'Unknown', countryCode: '', city: '-' };
    geoCache.set(cleanIp, unknown);
    setTimeout(() => geoCache.delete(cleanIp), 60000); // Retry after 1 min
    return unknown;
};

// --- Monitoring Service ---
const connectionCache = new Map(); 
let liveUserStats = {}; // Global state for API access

const monitorTraffic = async () => {
    if (os.platform() !== 'linux') return;

    // 1. Get detailed socket stats for SSH (port 22)
    const { stdout, success } = await runSystemCommand(`ss -tnipo 'sport = :22'`);
    
    if (!success) return;

    const lines = stdout.split('\n');
    const activePids = new Set();
    const userUpdates = {}; // Map<username, { ... }>

    let currentPid = null;
    let currentIp = null;
    let currentBytesSent = 0;
    let currentBytesRecv = 0;

    // Iterate lines to parse SS output
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Line type 1: ESTAB and Process/IP info
        if (line.startsWith('ESTAB')) {
            currentPid = null;
            currentIp = null;
            currentBytesSent = 0;
            currentBytesRecv = 0;

            const pidMatch = line.match(/users:\(\(".*?",pid=(\d+)/); 
            const ipMatch = line.match(/([0-9a-fA-F.:\[\]]+):[\w]+\s+([0-9a-fA-F.:\[\]]+)/);
            
            if (pidMatch && ipMatch) {
                currentPid = pidMatch[1];
                currentIp = ipMatch[2]; // Remote IP
                activePids.add(currentPid);
            }
        }
        
        // Line type 2: Metrics
        if (currentPid && (line.includes('bytes_acked') || line.includes('bytes_received'))) {
            const ackedMatch = line.match(/bytes_acked:(\d+)/);
            const receivedMatch = line.match(/bytes_received:(\d+)/);
            
            currentBytesSent = ackedMatch ? parseInt(ackedMatch[1]) : 0;
            currentBytesRecv = receivedMatch ? parseInt(receivedMatch[1]) : 0;

            // Resolve User
            let username = null;
            if (connectionCache.has(currentPid)) {
                username = connectionCache.get(currentPid).username;
            } else {
                const { stdout: userOut } = await runSystemCommand(`ps -o user= -p ${currentPid}`);
                username = userOut.trim();
            }

            if (username && username !== 'root' && username !== 'sshd') {
                if (!userUpdates[username]) {
                    userUpdates[username] = { 
                        upDelta: 0, 
                        downDelta: 0, 
                        activeConns: [],
                        totalUpSpeed: 0,
                        totalDownSpeed: 0,
                        lastIp: '',
                        lastCity: '',
                        lastCountry: ''
                    };
                }

                // Resolve Geo Info (Async but cached)
                const geo = await resolveGeo(currentIp);

                // Update aggregate IP info (use the first connection's IP)
                if (!userUpdates[username].lastIp) {
                    userUpdates[username].lastIp = currentIp;
                    userUpdates[username].lastCity = geo.city;
                    userUpdates[username].lastCountry = geo.countryCode;
                }

                userUpdates[username].activeConns.push({
                    id: currentPid,
                    ip: currentIp,
                    device: 'SSH Tunnel', 
                    country: geo.countryCode,
                    city: geo.city,
                    connectedAt: new Date().toISOString(),
                    currentDownloadSpeed: 0,
                    currentUploadSpeed: 0,
                    sessionUsageMB: (currentBytesSent + currentBytesRecv) / 1024 / 1024
                });

                // Calculate Deltas
                let prev = connectionCache.get(currentPid);
                if (!prev) {
                    prev = { bytes_sent: currentBytesSent, bytes_received: currentBytesRecv, last_update: Date.now(), username };
                }

                const deltaSent = Math.max(0, currentBytesSent - prev.bytes_sent);
                const deltaRecv = Math.max(0, currentBytesRecv - prev.bytes_received);
                
                // Speed Calculation
                const now = Date.now();
                const timeDiff = (now - prev.last_update) / 1000; 
                if (timeDiff > 0) {
                     const downSpeedMbps = (deltaSent * 8) / (1024 * 1024) / timeDiff;
                     const upSpeedMbps = (deltaRecv * 8) / (1024 * 1024) / timeDiff;
                     
                     userUpdates[username].totalDownSpeed += downSpeedMbps;
                     userUpdates[username].totalUpSpeed += upSpeedMbps;
                     
                     const idx = userUpdates[username].activeConns.length - 1;
                     userUpdates[username].activeConns[idx].currentDownloadSpeed = downSpeedMbps;
                     userUpdates[username].activeConns[idx].currentUploadSpeed = upSpeedMbps;
                }

                userUpdates[username].upDelta += deltaRecv;
                userUpdates[username].downDelta += deltaSent;

                connectionCache.set(currentPid, { 
                    bytes_sent: currentBytesSent, 
                    bytes_received: currentBytesRecv, 
                    last_update: now, 
                    username 
                });
            }
        }
    }

    // Clean old cache
    for (const pid of connectionCache.keys()) {
        if (!activePids.has(pid)) {
            connectionCache.delete(pid);
        }
    }

    // Update global state
    liveUserStats = userUpdates;

    // 3. Update Database (With explicit IP/Location persistence)
    // We update lastIp/City/Country only if the user is currently connected (update exists)
    const stmt = db.prepare(`
        UPDATE users SET 
        dataUsedGB = dataUsedGB + ?, 
        concurrentInUse = ?,
        currentUploadSpeed = ?,
        currentDownloadSpeed = ?,
        lastIp = COALESCE(?, lastIp),
        lastCountry = COALESCE(?, lastCountry),
        lastCity = COALESCE(?, lastCity)
        WHERE username = ?
    `);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        db.all("SELECT username, dataLimitGB, expiryDate, isActive, id FROM users", (err, rows) => {
            if(err) {
                console.error("DB Select Error:", err.message);
                try { stmt.finalize(); } catch(e) {}
                db.run("ROLLBACK");
                return;
            }
            
            rows.forEach(async (user) => {
                const update = userUpdates[user.username];
                
                let addGB = 0;
                let activeCount = 0;
                let upSpeed = 0;
                let downSpeed = 0;
                let lastIp = null;
                let lastCountry = null;
                let lastCity = null;

                if (update) {
                    addGB = (update.upDelta + update.downDelta) / (1024 * 1024 * 1024);
                    activeCount = update.activeConns.length;
                    upSpeed = update.totalUpSpeed;
                    downSpeed = update.totalDownSpeed;
                    lastIp = update.lastIp || null;
                    lastCountry = update.lastCountry || null;
                    lastCity = update.lastCity || null;

                    // --- SPEED MONITORING ONLY (No Kill) ---
                    // We removed the kill logic to prevent session drops.
                    // Future implementation: Use `tc` for traffic shaping instead of killing.
                    // ---------------------------------------
                }

                // Run update
                stmt.run(addGB, activeCount, upSpeed, downSpeed, lastIp, lastCountry, lastCity, user.username);

                // Data & Expiry Enforcement
                if (update) { 
                    const totalUsed = user.dataUsedGB + addGB; 
                    let shouldLock = false;

                    if (user.dataLimitGB > 0 && totalUsed >= user.dataLimitGB) shouldLock = true;
                    if (user.expiryDate && new Date() > new Date(user.expiryDate)) shouldLock = true;

                    if (shouldLock && user.isActive) {
                        console.log(`Locking user: ${user.username} (Quota/Expiry)`);
                        await runSystemCommand(`usermod -L "${user.username}"`);
                        await runSystemCommand(`pkill -u "${user.username}"`);
                        db.run("UPDATE users SET isActive = 0 WHERE id = ?", [user.id]);
                    }
                }
            });
            
            stmt.finalize();
            db.run("COMMIT");
        });
    });
};

setInterval(monitorTraffic, 2000);

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
        
        const users = rows.map(u => {
            const stats = liveUserStats[u.username];
            
            // Merge Live Stats with DB Persisted stats
            // If user is offline (no live stats), fall back to DB 'last' values
            let activeConns = stats ? stats.activeConns : [];

            // If no active connections, we might want to show the last known location in the UI
            // But activeConnections implies *currently* active.
            // We will pass lastIp/City separately in the User object.

            return {
                ...u,
                isActive: !!u.isActive,
                activeConnections: activeConns,
                currentUploadSpeed: stats ? stats.totalUpSpeed : 0,
                currentDownloadSpeed: stats ? stats.totalDownSpeed : 0
            };
        });
        res.json(users);
    });
});

app.post('/api/users', async (req, res) => {
    const u = req.body;
    const datePart = u.expiryDate.split('T')[0];
    const userAddCmd = `useradd -M -s /sbin/nologin -e "${datePart}" "${u.username}"`;
    const setPassCmd = `echo '${u.username}:${u.password}' | chpasswd`;

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

    db.get("SELECT username FROM users WHERE id = ?", [id], async (err, row) => {
        if (err || !row) return res.status(500).json({ error: "User not found" });
        
        const username = row.username;
        const datePart = u.expiryDate.split('T')[0];
        
        await runSystemCommand(`usermod -s /sbin/nologin -e "${datePart}" "${username}"`);
        await runSystemCommand(`echo '${username}:${u.password}' | chpasswd`);
        
        if (u.isActive) {
            await runSystemCommand(`usermod -U "${username}"`);
        } else {
            await runSystemCommand(`usermod -L "${username}"`);
            await runSystemCommand(`pkill -u "${username}"`);
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
             await runSystemCommand(`userdel -f "${row.username}"`);
             await runSystemCommand(`pkill -u "${row.username}"`);

             db.run("DELETE FROM users WHERE id = ?", [id], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ success: true });
            });
        } else {
            res.json({ success: false });
        }
    });
});

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

    db.get("SELECT SUM(dataUsedGB) as total FROM users", (err, row) => {
        const totalTraffic = row ? row.total : 0;
        
        res.json({
            cpu: cpuUsage,
            ram: (usedMem / totalMem) * 100,
            disk: 45, 
            uptime: `${days}d, ${hours}h`,
            totalTrafficUp: 0, 
            totalTrafficDown: totalTraffic * 1024 
        });
    });
});

app.use(express.static(join(__dirname, '../dist')));
app.get('*', (req, res) => {
    const indexFile = join(__dirname, '../dist/index.html');
    res.sendFile(indexFile, (err) => {
        if (err) {
            res.status(500).send("Server Error.");
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`OS Platform: ${os.platform()}`);
    console.log(`Traffic Monitoring Started (Interval: 2s)`);
});
