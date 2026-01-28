
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
            // console.log(`[Simulated Command]: ${command}`);
            return resolve({ stdout: '', success: true }); // Always success on dev
        }

        exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                // console.error(`Error executing: ${command}`, error.message);
                resolve({ stdout: '', stderr, success: false });
            } else {
                resolve({ stdout, success: true });
            }
        });
    });
};

// --- Monitoring Service ---
// Stores previous byte counts to calculate speed and delta usage
const connectionCache = new Map(); 
/* 
  connectionCache structure:
  Key: PID
  Value: { 
    bytes_sent: number, 
    bytes_received: number, 
    last_update: timestamp,
    username: string 
  }
*/

const monitorTraffic = async () => {
    if (os.platform() !== 'linux') return;

    // 1. Get detailed socket stats for SSH (port 22)
    // -t: tcp, -n: numeric, -i: internal info (bytes), -p: process
    const { stdout, success } = await runSystemCommand(`ss -tnip 'sport = :22'`);
    
    if (!success) return;

    const lines = stdout.split('\n');
    const activePids = new Set();
    const userUpdates = {}; // Map<username, { uploadDelta: 0, downloadDelta: 0, activeConns: [] }>

    // 2. Parse ss output
    // Looking for lines like: 
    // ESTAB ... users:(("sshd",pid=1234,fd=3))
    // ... bytes_acked:100 bytes_received:200 ...
    
    let currentPid = null;
    let currentIp = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Line 1: State, IP info, Process info
        if (line.startsWith('ESTAB')) {
            const pidMatch = line.match(/users:\(\("sshd",pid=(\d+)/);
            const ipMatch = line.match(/(\d+\.\d+\.\d+\.\d+):\d+\s+(\d+\.\d+\.\d+\.\d+)/); // Local -> Remote
            
            if (pidMatch && ipMatch) {
                currentPid = pidMatch[1];
                currentIp = ipMatch[2]; // Remote IP
                activePids.add(currentPid);
            } else {
                currentPid = null;
            }
        } 
        // Line 2 (usually): Metrics (bytes_acked, bytes_received)
        else if (currentPid && (line.includes('bytes_acked') || line.includes('bytes_received'))) {
            // bytes_acked = Data sent BY server (Download for user)
            // bytes_received = Data received BY server (Upload for user)
            const ackedMatch = line.match(/bytes_acked:(\d+)/);
            const receivedMatch = line.match(/bytes_received:(\d+)/);
            
            const bytesSent = ackedMatch ? parseInt(ackedMatch[1]) : 0;
            const bytesRecv = receivedMatch ? parseInt(receivedMatch[1]) : 0;

            // Determine User for this PID
            let username = null;
            
            // Check cache first
            if (connectionCache.has(currentPid)) {
                username = connectionCache.get(currentPid).username;
            } else {
                // If not in cache, resolve PID to User
                const { stdout: userOut } = await runSystemCommand(`ps -o user= -p ${currentPid}`);
                username = userOut.trim();
            }

            if (username && username !== 'root') { // Ignore root ssh sessions
                // Initialize user aggregate data if needed
                if (!userUpdates[username]) {
                    userUpdates[username] = { 
                        upDelta: 0, 
                        downDelta: 0, 
                        activeConns: [],
                        totalUpSpeed: 0,
                        totalDownSpeed: 0
                    };
                }

                // Add connection info
                userUpdates[username].activeConns.push({
                    id: currentPid,
                    ip: currentIp,
                    device: 'SSH Client', // Unknown without deep packet inspection
                    country: 'Unknown',
                    connectedAt: new Date().toISOString(),
                    currentDownloadSpeed: 0,
                    currentUploadSpeed: 0,
                    sessionUsageMB: (bytesSent + bytesRecv) / 1024 / 1024
                });

                // Calculate Deltas (Traffic happened since last check)
                let prev = connectionCache.get(currentPid);
                if (!prev) {
                    prev = { bytes_sent: bytesSent, bytes_received: bytesRecv, last_update: Date.now(), username };
                }

                // Handle counter resets (new connection or re-use) usually ss counters are cumulative for the socket
                const deltaSent = Math.max(0, bytesSent - prev.bytes_sent);
                const deltaRecv = Math.max(0, bytesRecv - prev.bytes_received);
                
                // Calculate Speed (Mbps)
                // interval is approx 2000ms
                const now = Date.now();
                const timeDiff = (now - prev.last_update) / 1000; // seconds
                if (timeDiff > 0) {
                     const downSpeedMbps = (deltaSent * 8) / (1024 * 1024) / timeDiff;
                     const upSpeedMbps = (deltaRecv * 8) / (1024 * 1024) / timeDiff;
                     
                     userUpdates[username].totalDownSpeed += downSpeedMbps;
                     userUpdates[username].totalUpSpeed += upSpeedMbps;
                     
                     // Update the specific connection object in the array
                     const connIndex = userUpdates[username].activeConns.length - 1;
                     userUpdates[username].activeConns[connIndex].currentDownloadSpeed = downSpeedMbps;
                     userUpdates[username].activeConns[connIndex].currentUploadSpeed = upSpeedMbps;
                }

                userUpdates[username].upDelta += deltaRecv;
                userUpdates[username].downDelta += deltaSent;

                // Update Cache
                connectionCache.set(currentPid, { 
                    bytes_sent: bytesSent, 
                    bytes_received: bytesRecv, 
                    last_update: now,
                    username 
                });
            }
        }
    }

    // Cleanup dead connections from cache
    for (const pid of connectionCache.keys()) {
        if (!activePids.has(pid)) {
            connectionCache.delete(pid);
        }
    }

    // 3. Update Database & Enforce Limits
    const stmt = db.prepare(`
        UPDATE users SET 
        dataUsedGB = dataUsedGB + ?, 
        concurrentInUse = ?,
        currentUploadSpeed = ?,
        currentDownloadSpeed = ?
        WHERE username = ?
    `);

    db.serialize(() => {
        db.run("BEGIN TRANSACTION");
        
        // Reset stats for all users first (to handle disconnected users showing speed)
        // We set speed to 0, if they are active, the loop below will overwrite it.
        // But we keep concurrentInUse until updated.
        // Optimized: We fetch all users, if not in userUpdates, set speed 0.
        db.all("SELECT username, dataLimitGB, expiryDate, isActive, id FROM users", (err, rows) => {
            if(err) return;
            
            rows.forEach(user => {
                const update = userUpdates[user.username];
                
                let addGB = 0;
                let activeCount = 0;
                let upSpeed = 0;
                let downSpeed = 0;

                if (update) {
                    // Convert bytes to GB
                    addGB = (update.upDelta + update.downDelta) / (1024 * 1024 * 1024);
                    activeCount = update.activeConns.length;
                    upSpeed = update.totalUpSpeed;
                    downSpeed = update.totalDownSpeed;
                }

                // Update Stats
                stmt.run(addGB, activeCount, upSpeed, downSpeed, user.username);

                // --- Enforcement Logic ---
                const checkEnforcement = async () => {
                     let shouldLock = false;
                     
                     // 1. Check Data Limit (if not 0/unlimited)
                     // Note: We need accurate current usage. We just added `addGB`. 
                     // Since we are in a transaction, we can't easily read back the *new* value immediately 
                     // inside this JS loop without complexity. 
                     // We approximate check using JS state or trigger a lock in next cycle.
                     // Better: check against the `row` data + `addGB`.
                     
                     // Retrieve current total used from DB logic is hard inside loop. 
                     // Let's rely on the Frontend/Next cycle or a separate query?
                     // Let's do a simple check:
                     
                     // We need the updated total.
                     db.get("SELECT dataUsedGB FROM users WHERE id = ?", [user.id], async (err, rowStats) => {
                        if (!rowStats) return;
                        const totalUsed = rowStats.dataUsedGB + addGB;
                        
                        if (user.dataLimitGB > 0 && totalUsed >= user.dataLimitGB) {
                            shouldLock = true;
                            console.log(`User ${user.username} exceeded data limit. Locking.`);
                        }

                        // 2. Check Expiry
                        if (user.expiryDate) {
                            const expiry = new Date(user.expiryDate);
                            if (new Date() > expiry) {
                                shouldLock = true;
                                console.log(`User ${user.username} expired. Locking.`);
                            }
                        }

                        if (shouldLock && user.isActive) {
                            // Lock System User
                            await runSystemCommand(`usermod -L "${user.username}"`);
                            // Kill active connections
                            await runSystemCommand(`pkill -u "${user.username}"`);
                            // Update DB status
                            db.run("UPDATE users SET isActive = 0 WHERE id = ?", [user.id]);
                        }
                     });
                };
                checkEnforcement();
            });
        });
        
        db.run("COMMIT");
    });
    stmt.finalize();
};

// Start Monitoring Loop (Every 2 seconds)
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
        
        // Enhance user objects with cached connection info if available
        // Note: activeConnections is not stored in DB, we generate it from live monitoring or return empty
        // For simplicity in this implementation, we return basic DB stats. 
        // Real active connections would require a separate in-memory store or table.
        // Let's simply reconstruct active connection array from cache for the specific user.
        
        const users = rows.map(u => {
            // Find active connections in cache for this user
            const activeConns = [];
            for (const [pid, info] of connectionCache.entries()) {
                if (info.username === u.username) {
                     activeConns.push({
                        id: pid,
                        ip: 'Active', // We don't persist IP in cache details perfectly in this snippet, but 'ss' logic has it.
                        country: '-',
                        device: 'SSH',
                        currentDownloadSpeed: 0, // Simplified for list view
                        currentUploadSpeed: 0
                     });
                }
            }

            return {
                ...u,
                isActive: !!u.isActive,
                activeConnections: activeConns
            };
        });
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
    
    // Improved password setting
    const setPassCmd = `echo '${u.username}:${u.password}' | chpasswd`;

    // Execute system commands first
    const cmd1 = await runSystemCommand(userAddCmd);
    const cmd2 = await runSystemCommand(setPassCmd);

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
        await runSystemCommand(`usermod -s /sbin/nologin -e "${datePart}" "${username}"`);
        await runSystemCommand(`echo '${username}:${u.password}' | chpasswd`);
        
        // Lock/Unlock based on isActive
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
             // Delete System User
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

    // Calculate total network traffic from DB sum
    db.get("SELECT SUM(dataUsedGB) as total FROM users", (err, row) => {
        const totalTraffic = row ? row.total : 0;
        
        res.json({
            cpu: cpuUsage,
            ram: (usedMem / totalMem) * 100,
            disk: 45, // Static for now, usually requires 'df' command
            uptime: `${days}d, ${hours}h`,
            totalTrafficUp: 0, // Hard to separate global up/down without interface monitoring
            totalTrafficDown: totalTraffic * 1024 // Convert GB to MB for display consistency if needed
        });
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
    console.log(`Traffic Monitoring Started (Interval: 2s)`);
});
