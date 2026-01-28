
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure database directory exists
const dbDir = join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir);
}

const dbPath = join(dbDir, 'panel.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initDb();
    }
});

function initDb() {
    db.serialize(() => {
        // Users Table - Added speedLimitTotal
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            isActive INTEGER,
            expiryDate TEXT,
            dataLimitGB REAL,
            dataUsedGB REAL,
            concurrentLimit INTEGER,
            concurrentInUse INTEGER,
            createdAt TEXT,
            notes TEXT,
            speedLimitUpload INTEGER DEFAULT 0,
            speedLimitDownload INTEGER DEFAULT 0,
            speedLimitTotal INTEGER DEFAULT 0
        )`, (err) => {
            if (!err) {
                // Migration: Check if column exists, if not add it (simple migration logic)
                db.all("PRAGMA table_info(users)", (err, rows) => {
                    const hasTotal = rows.some(r => r.name === 'speedLimitTotal');
                    if (!hasTotal) {
                        db.run("ALTER TABLE users ADD COLUMN speedLimitTotal INTEGER DEFAULT 0");
                    }
                });
            }
        });

        // Settings Table
        db.run(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )`);

        // Seed initial settings if empty
        db.get("SELECT count(*) as count FROM settings", (err, row) => {
            if (row.count === 0) {
                const initialSettings = {
                    panelDomain: 'panel.example.com',
                    serverIp: '192.168.1.100',
                    adminUser: 'admin',
                    adminPass: 'admin123',
                    is2FAEnabled: 'false',
                    secret2FA: 'JBSWY3DPEHPK3PXP'
                };
                const stmt = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
                Object.entries(initialSettings).forEach(([k, v]) => stmt.run(k, v));
                stmt.finalize();
            }
        });
    });
}

export default db;
