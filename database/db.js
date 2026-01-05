const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
    }

    connect() {
        return new Promise((resolve, reject) => {
            const dbPath = path.join(__dirname, '..', 'chat.db');
            this.db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                    reject(err);
                } else {
                    console.log('Connected to SQLite database');
                    this.initializeTables().then(resolve).catch(reject);
                }
            });
        });
    }

    initializeTables() {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run(`
          CREATE TABLE IF NOT EXISTS servers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            avatar TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

                this.db.run(`
          CREATE TABLE IF NOT EXISTS channels (
            id TEXT PRIMARY KEY,
            server_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            type TEXT DEFAULT 'text',
            whiteboard_data TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (server_id) REFERENCES servers(id)
          )
        `);

                this.db.run(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar TEXT,
            status TEXT DEFAULT 'offline',
            role TEXT DEFAULT 'Member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

                this.db.run(`
          CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            user_name TEXT NOT NULL,
            user_avatar TEXT,
            text TEXT,
            file_path TEXT,
            file_name TEXT,
            file_type TEXT,
            file_size INTEGER,
            is_link BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            expire_at DATETIME,
            FOREIGN KEY (channel_id) REFERENCES channels(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `);

                this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id);
        `);

                this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
        `);

                this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
        `, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        this.migrateDatabase().then(() => {
                            this.initializeDefaultData().then(resolve).catch(reject);
                        }).catch(reject);
                    }
                });
            });
        });
    }

    migrateDatabase() {
        return new Promise((resolve, reject) => {
            this.db.all("PRAGMA table_info(messages)", (err, columns) => {
                if (err) {
                    reject(err);
                    return;
                }

                const columnNames = columns.map(col => col.name);
                const migrations = [];

                if (!columnNames.includes('file_path')) {
                    migrations.push('ALTER TABLE messages ADD COLUMN file_path TEXT');
                }
                if (!columnNames.includes('file_name')) {
                    migrations.push('ALTER TABLE messages ADD COLUMN file_name TEXT');
                }
                if (!columnNames.includes('file_type')) {
                    migrations.push('ALTER TABLE messages ADD COLUMN file_type TEXT');
                }
                if (!columnNames.includes('file_size')) {
                    migrations.push('ALTER TABLE messages ADD COLUMN file_size INTEGER');
                }
                if (!columnNames.includes('is_link')) {
                    migrations.push('ALTER TABLE messages ADD COLUMN is_link BOOLEAN DEFAULT 0');
                }
                if (!columnNames.includes('expire_at')) {
                    migrations.push('ALTER TABLE messages ADD COLUMN expire_at DATETIME');
                }

                if (migrations.length === 0) {
                    resolve();
                    return;
                }

                let completed = 0;
                migrations.forEach((migration, index) => {
                    this.db.run(migration, (err) => {
                        if (err) {
                            console.error(`Migration ${index + 1} failed:`, err);
                        }
                        completed++;
                        if (completed === migrations.length) {
                            resolve();
                        }
                    });
                });
            });
        });
    }

    initializeDefaultData() {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT COUNT(*) as count FROM servers', (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (row.count === 0) {
                    this.db.run('INSERT INTO servers (id, name) VALUES (1, ?)', ['นกพิราบ'], (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        this.db.run('INSERT INTO channels (id, server_id, name, type) VALUES (?, ?, ?, ?)',
                            ['c1', 1, 'ทั่วไป', 'text'], (err) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve();
                                }
                            });
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    get(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(query, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(query, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    run(query, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(query, params, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}

module.exports = Database;

