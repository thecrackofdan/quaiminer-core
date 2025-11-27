// Database module for Quai GPU Miner
// Uses SQLite for data persistence

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises;

const DB_PATH = path.join(__dirname, 'data', 'quaiminer.db');

// Ensure data directory exists
(async () => {
    try {
        await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
})();

// Initialize database
let db;
try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better performance
    initializeDatabase();
} catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
}

function initializeDatabase() {
    // Validated blocks table
    db.exec(`
        CREATE TABLE IF NOT EXISTS validated_blocks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            block_number INTEGER NOT NULL,
            block_hash TEXT,
            timestamp INTEGER NOT NULL,
            chain TEXT DEFAULT 'Prime',
            reward REAL DEFAULT 0,
            tx_hash TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(block_number, chain)
        );
        
        CREATE INDEX IF NOT EXISTS idx_blocks_number ON validated_blocks(block_number);
        CREATE INDEX IF NOT EXISTS idx_blocks_timestamp ON validated_blocks(timestamp);
        CREATE INDEX IF NOT EXISTS idx_blocks_chain ON validated_blocks(chain);
    `);

    // Mining statistics table (for historical data)
    db.exec(`
        CREATE TABLE IF NOT EXISTS mining_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            hash_rate REAL DEFAULT 0,
            accepted_shares INTEGER DEFAULT 0,
            rejected_shares INTEGER DEFAULT 0,
            power_usage REAL DEFAULT 0,
            temperature REAL DEFAULT 0,
            fan_speed INTEGER DEFAULT 0,
            gpu_id INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_stats_timestamp ON mining_stats(timestamp);
        CREATE INDEX IF NOT EXISTS idx_stats_gpu ON mining_stats(gpu_id);
    `);

    // Users table (for authentication)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            api_key TEXT UNIQUE,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
        CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
    `);

    // Configuration table
    db.exec(`
        CREATE TABLE IF NOT EXISTS config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // Notifications table
    db.exec(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `);

    // Alert rules table
    db.exec(`
        CREATE TABLE IF NOT EXISTS alert_rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            condition TEXT NOT NULL,
            enabled BOOLEAN DEFAULT 1,
            channels TEXT NOT NULL,
            cooldown INTEGER DEFAULT 300,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
    `);

    // Alert history table
    db.exec(`
        CREATE TABLE IF NOT EXISTS alert_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            rule_id TEXT NOT NULL,
            rule_name TEXT NOT NULL,
            type TEXT NOT NULL,
            message TEXT NOT NULL,
            channels TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rule_id) REFERENCES alert_rules(id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON alert_history(rule_id);
        CREATE INDEX IF NOT EXISTS idx_alert_history_timestamp ON alert_history(timestamp);
    `);

    // Alert configuration table
    db.exec(`
        CREATE TABLE IF NOT EXISTS alert_config (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    console.log('✅ Database initialized successfully');
}

// Validated Blocks
const blocks = {
    getAll: (limit = 100) => {
        return db.prepare(`
            SELECT * FROM validated_blocks 
            ORDER BY block_number DESC 
            LIMIT ?
        `).all(limit);
    },

    getByRange: (startBlock, endBlock) => {
        return db.prepare(`
            SELECT * FROM validated_blocks 
            WHERE block_number BETWEEN ? AND ?
            ORDER BY block_number DESC
        `).all(startBlock, endBlock);
    },

    getByChain: (chain, limit = 100) => {
        return db.prepare(`
            SELECT * FROM validated_blocks 
            WHERE chain = ?
            ORDER BY block_number DESC 
            LIMIT ?
        `).all(chain, limit);
    },

    getStats: () => {
        const total = db.prepare('SELECT COUNT(*) as count FROM validated_blocks').get();
        const last24h = db.prepare(`
            SELECT COUNT(*) as count FROM validated_blocks 
            WHERE timestamp > ?
        `).get(Date.now() - 24 * 60 * 60 * 1000);
        const last7d = db.prepare(`
            SELECT COUNT(*) as count FROM validated_blocks 
            WHERE timestamp > ?
        `).get(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const totalReward = db.prepare('SELECT SUM(reward) as total FROM validated_blocks').get();

        return {
            total: total.count,
            last24h: last24h.count,
            last7d: last7d.count,
            totalReward: totalReward.total || 0
        };
    },

    add: (block) => {
        try {
            const stmt = db.prepare(`
                INSERT INTO validated_blocks 
                (block_number, block_hash, timestamp, chain, reward, tx_hash)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(
                block.blockNumber,
                block.blockHash || null,
                block.timestamp || Date.now(),
                block.chain || 'Prime',
                block.reward || 0,
                block.txHash || null
            );
            return { success: true, id: result.lastInsertRowid };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return { success: false, error: 'Block already exists' };
            }
            throw error;
        }
    },

    deleteOld: (keepCount = 1000) => {
        const count = db.prepare('SELECT COUNT(*) as count FROM validated_blocks').get().count;
        if (count > keepCount) {
            const toDelete = count - keepCount;
            db.prepare(`
                DELETE FROM validated_blocks 
                WHERE id IN (
                    SELECT id FROM validated_blocks 
                    ORDER BY block_number ASC 
                    LIMIT ?
                )
            `).run(toDelete);
            return { deleted: toDelete };
        }
        return { deleted: 0 };
    }
};

// Mining Statistics
const stats = {
    add: (stat) => {
        const stmt = db.prepare(`
            INSERT INTO mining_stats 
            (timestamp, hash_rate, accepted_shares, rejected_shares, power_usage, temperature, fan_speed, gpu_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            stat.timestamp || Date.now(),
            stat.hashRate || 0,
            stat.acceptedShares || 0,
            stat.rejectedShares || 0,
            stat.powerUsage || 0,
            stat.temperature || 0,
            stat.fanSpeed || 0,
            stat.gpuId || 0
        );
    },

    getHistory: (hours = 24, gpuId = null) => {
        const since = Date.now() - (hours * 60 * 60 * 1000);
        if (gpuId !== null) {
            return db.prepare(`
                SELECT * FROM mining_stats 
                WHERE timestamp > ? AND gpu_id = ?
                ORDER BY timestamp ASC
            `).all(since, gpuId);
        }
        return db.prepare(`
            SELECT * FROM mining_stats 
            WHERE timestamp > ?
            ORDER BY timestamp ASC
        `).all(since);
    },

    getAggregated: (hours = 24, interval = 60) => {
        // Get aggregated stats by time interval (in minutes)
        const since = Date.now() - (hours * 60 * 60 * 1000);
        const intervalMs = interval * 60 * 1000;
        
        return db.prepare(`
            SELECT 
                (timestamp / ?) * ? as time_bucket,
                AVG(hash_rate) as avg_hash_rate,
                MAX(hash_rate) as max_hash_rate,
                AVG(temperature) as avg_temperature,
                MAX(temperature) as max_temperature,
                AVG(power_usage) as avg_power,
                SUM(accepted_shares) as total_accepted,
                SUM(rejected_shares) as total_rejected
            FROM mining_stats
            WHERE timestamp > ?
            GROUP BY time_bucket
            ORDER BY time_bucket ASC
        `).all(intervalMs, intervalMs, since);
    }
};

// Users (for authentication)
const users = {
    create: (username, passwordHash, apiKey) => {
        const stmt = db.prepare(`
            INSERT INTO users (username, password_hash, api_key, role)
            VALUES (?, ?, ?, 'user')
        `);
        return stmt.run(username, passwordHash, apiKey);
    },

    findByUsername: (username) => {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    findByApiKey: (apiKey) => {
        return db.prepare('SELECT * FROM users WHERE api_key = ?').get(apiKey);
    },

    updateLastLogin: (userId) => {
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(userId);
    }
};

// Notifications
const notifications = {
    create: (userId, type, title, message) => {
        const stmt = db.prepare(`
            INSERT INTO notifications (user_id, type, title, message)
            VALUES (?, ?, ?, ?)
        `);
        return stmt.run(userId, type, title, message);
    },

    getUnread: (userId) => {
        return db.prepare(`
            SELECT * FROM notifications 
            WHERE user_id = ? AND read = 0
            ORDER BY created_at DESC
        `).all(userId);
    },

    markRead: (notificationId, userId) => {
        db.prepare(`
            UPDATE notifications 
            SET read = 1 
            WHERE id = ? AND user_id = ?
        `).run(notificationId, userId);
    }
};

// Configuration
const config = {
    get: (key) => {
        const result = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
        return result ? result.value : null;
    },

    set: (key, value) => {
        const stmt = db.prepare(`
            INSERT INTO config (key, value) 
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(key, value, value);
    }
};

// Alert rules
const alertRules = {
    getAll: () => {
        return db.prepare('SELECT * FROM alert_rules ORDER BY name').all();
    },

    get: (id) => {
        return db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id);
    },

    create: (rule) => {
        const stmt = db.prepare(`
            INSERT INTO alert_rules (id, name, type, condition, enabled, channels, cooldown)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            rule.id,
            rule.name,
            rule.type,
            JSON.stringify(rule.condition),
            rule.enabled ? 1 : 0,
            JSON.stringify(rule.channels || []),
            rule.cooldown || 300
        );
    },

    update: (id, updates) => {
        const fields = [];
        const values = [];
        
        if (updates.name !== undefined) {
            fields.push('name = ?');
            values.push(updates.name);
        }
        if (updates.condition !== undefined) {
            fields.push('condition = ?');
            values.push(JSON.stringify(updates.condition));
        }
        if (updates.enabled !== undefined) {
            fields.push('enabled = ?');
            values.push(updates.enabled ? 1 : 0);
        }
        if (updates.channels !== undefined) {
            fields.push('channels = ?');
            values.push(JSON.stringify(updates.channels));
        }
        if (updates.cooldown !== undefined) {
            fields.push('cooldown = ?');
            values.push(updates.cooldown);
        }
        
        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        
        const stmt = db.prepare(`UPDATE alert_rules SET ${fields.join(', ')} WHERE id = ?`);
        return stmt.run(...values);
    },

    delete: (id) => {
        return db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
    }
};

// Alert history
const alertHistory = {
    add: (alert) => {
        const stmt = db.prepare(`
            INSERT INTO alert_history (rule_id, rule_name, type, message, channels, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(
            alert.ruleId,
            alert.ruleName,
            alert.type,
            alert.message,
            JSON.stringify(alert.channels || []),
            alert.timestamp
        );
    },

    getRecent: (limit = 100) => {
        return db.prepare(`
            SELECT * FROM alert_history 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(limit);
    },

    getByRule: (ruleId, limit = 50) => {
        return db.prepare(`
            SELECT * FROM alert_history 
            WHERE rule_id = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(ruleId, limit);
    }
};

// Alert configuration
const alertConfig = {
    get: (key) => {
        const result = db.prepare('SELECT value FROM alert_config WHERE key = ?').get(key);
        return result ? JSON.parse(result.value) : null;
    },

    set: (key, value) => {
        const stmt = db.prepare(`
            INSERT INTO alert_config (key, value) 
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
        `);
        return stmt.run(key, JSON.stringify(value), JSON.stringify(value));
    },

    getAll: () => {
        const results = db.prepare('SELECT * FROM alert_config').all();
        const config = {};
        results.forEach(row => {
            try {
                config[row.key] = JSON.parse(row.value);
            } catch (e) {
                config[row.key] = row.value;
            }
        });
        return config;
    }
};

module.exports = {
    db,
    blocks,
    stats,
    users,
    notifications,
    config,
    alertRules,
    alertHistory,
    alertConfig,
    close: () => db.close()
};

