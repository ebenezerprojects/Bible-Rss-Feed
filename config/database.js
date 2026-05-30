const Database = require('better-sqlite3');

let db = null;

function initializeDatabase() {
    if (!db) {
        const dbPath = process.env.DB_PATH || './db/bible.db';
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        console.log(`✅ Database connected: ${dbPath}`);
    }
    return db;
}

function getDatabase() {
    if (!db) {
        initializeDatabase();
    }
    return db;
}

function closeDatabase() {
    if (db) {
        db.close();
        console.log('🔴 Database connection closed');
    }
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase
};