const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const config = require('./index');
const { logger } = require('./logger');

let userDb = null;
let versionDbCache = new Map();

function initializeUserDatabase() {
    if (!userDb) {
        const dbPath = path.resolve(process.cwd(), config.database.userDbPath);
        const dbDir = path.dirname(dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        userDb = new Database(dbPath);
        userDb.pragma('foreign_keys = ON');
        userDb.pragma('journal_mode = WAL');
        logger.info(`User database connected: ${dbPath}`);

        initializeTables();
        insertDefaultData();
        createDefaultAdmin();

        // Start session cleanup interval (runs every hour)
        startSessionCleanup();
    }
    return userDb;
}

function initializeTables() {
    // ==================== ROLES TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS roles (
            role_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            role_code TEXT NOT NULL UNIQUE,
            role_name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ==================== PERMISSIONS TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS permissions (
            permission_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            permission_code TEXT NOT NULL UNIQUE,
            permission_name TEXT NOT NULL,
            module TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ==================== ROLE PERMISSIONS TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS role_permissions (
            role_permission_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            role_fk INTEGER NOT NULL,
            permission_fk INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            granted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_fk) REFERENCES roles(role_pk) ON DELETE CASCADE,
            FOREIGN KEY (permission_fk) REFERENCES permissions(permission_pk) ON DELETE CASCADE,
            UNIQUE(role_fk, permission_fk)
        )
    `);

    // ==================== USER TABLE (UPDATED WITH ROLE FK) ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS user (
            user_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            email TEXT,
            full_name TEXT,
            role_fk INTEGER,
            is_active BOOLEAN DEFAULT 1,
            last_login TIMESTAMP,
            session_token TEXT,
            session_expiry TIMESTAMP,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_fk) REFERENCES roles(role_pk) ON DELETE SET NULL
        )
    `);

    // ==================== BIBLE VERSION TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS bible_version (
            version_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            version_code TEXT NOT NULL UNIQUE,
            version_name TEXT NOT NULL,
            db_path TEXT NOT NULL,
            language_code TEXT NOT NULL,
            language_name TEXT NOT NULL,
            copyright TEXT NOT NULL,
            book_table TEXT NOT NULL,
            book_pk TEXT NOT NULL,
            verse_table TEXT NOT NULL,
            verse_fk TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ==================== USER BIBLE MAPPING TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS user_bible_mapping (
            mapping_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_fk INTEGER NOT NULL,
            version_fk INTEGER NOT NULL,
            is_default BOOLEAN DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
            FOREIGN KEY (version_fk) REFERENCES bible_version(version_pk) ON DELETE CASCADE,
            UNIQUE(user_fk, version_fk)
        )
    `);

    // ==================== AVAILABLE FORMATS TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS available_formats (
            format_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            format_code TEXT NOT NULL UNIQUE,
            format_name TEXT NOT NULL,
            format_type TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            display_order INTEGER DEFAULT 0,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // ==================== USER FORMAT PERMISSIONS TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS user_format_permissions (
            permission_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_fk INTEGER NOT NULL,
            format_fk INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            granted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by TEXT,
            FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
            FOREIGN KEY (format_fk) REFERENCES available_formats(format_pk) ON DELETE CASCADE,
            UNIQUE(user_fk, format_fk)
        )
    `);

    // ==================== RSS FEED HISTORY TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS rss_feed_history (
            rss_history_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_fk INTEGER NOT NULL,
            version_fk INTEGER NOT NULL,
            reference TEXT NOT NULL,
            verse TEXT NOT NULL,
            book_name TEXT NOT NULL,
            book_short_name TEXT NOT NULL,
            chapter_num INTEGER NOT NULL,
            verse_num INTEGER NOT NULL,
            session_token TEXT,
            accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_latest BOOLEAN DEFAULT 0,
            FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
            FOREIGN KEY (version_fk) REFERENCES bible_version(version_pk) ON DELETE CASCADE
        )
    `);

    // ==================== API REQUEST HISTORY TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS api_request_history (
            request_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_fk INTEGER NOT NULL,
            session_token TEXT,
            request_url TEXT NOT NULL,
            endpoint_type TEXT NOT NULL,
            request_key TEXT,
            response_time_ms INTEGER,
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE
        )
    `);

    // ==================== USER FILE LOCATIONS TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS user_file_locations (
            location_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_fk INTEGER NOT NULL,
            location_type TEXT NOT NULL,
            file_path TEXT NOT NULL,
            is_active BOOLEAN DEFAULT 1,
            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
            UNIQUE(user_fk, location_type)
        )
    `);

    // ==================== AUDIT LOG TABLE ====================
    userDb.exec(`
        CREATE TABLE IF NOT EXISTS audit_log (
            audit_pk INTEGER PRIMARY KEY AUTOINCREMENT,
            user_fk INTEGER,
            action TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT,
            old_values TEXT,
            new_values TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE SET NULL
        )
    `);

    logger.info('Database tables initialized');
}

function insertDefaultData() {
    // ==================== INSERT DEFAULT ROLES ====================
    const roles = [
        ['admin', 'Administrator', 'Full system access with all permissions'],
        ['user', 'Standard User', 'Regular user with basic Bible reading permissions'],
        ['viewer', 'Viewer', 'Read-only access to Bible content'],
        ['editor', 'Editor', 'Can edit content but not manage users']
    ];

    for (const [code, name, description] of roles) {
        const roleExists = userDb.prepare("SELECT role_pk FROM roles WHERE role_code = ?").get(code);
        if (!roleExists) {
            userDb.prepare(`INSERT INTO roles (role_code, role_name, description) VALUES (?, ?, ?)`).run(code, name, description);
            logger.info(`Role added: ${code}`);
        }
    }

    // ==================== INSERT DEFAULT PERMISSIONS ====================
    const permissions = [
        // User Management
        ['user.view', 'View Users', 'User Management'],
        ['user.create', 'Create Users', 'User Management'],
        ['user.edit', 'Edit Users', 'User Management'],
        ['user.delete', 'Delete Users', 'User Management'],
        ['user.assign_roles', 'Assign Roles', 'User Management'],
        
        // Bible Access
        ['bible.read', 'Read Bible', 'Bible'],
        ['bible.search', 'Search Bible', 'Bible'],
        ['bible.export', 'Export Bible Content', 'Bible'],
        
        // Formats
        ['format.rss', 'Access RSS Feeds', 'Formats'],
        ['format.xml', 'Access XML Format', 'Formats'],
        ['format.json', 'Access JSON Format', 'Formats'],
        ['format.txt', 'Access TXT Format', 'Formats'],
        
        // File Locations
        ['file.location.set', 'Set File Locations', 'File Locations'],
        ['file.location.view', 'View File Locations', 'File Locations'],
        
        // Backup (Admin only)
        ['backup.create', 'Create Backups', 'Backup'],
        ['backup.restore', 'Restore Backups', 'Backup'],
        ['backup.delete', 'Delete Backups', 'Backup'],
        
        // System
        ['system.health', 'View Health Status', 'System'],
        ['system.logs', 'View System Logs', 'System'],
        ['system.stats', 'View System Statistics', 'System']
    ];

    for (const [code, name, module] of permissions) {
        const permExists = userDb.prepare("SELECT permission_pk FROM permissions WHERE permission_code = ?").get(code);
        if (!permExists) {
            userDb.prepare(`INSERT INTO permissions (permission_code, permission_name, module) VALUES (?, ?, ?)`).run(code, name, module);
            logger.info(`Permission added: ${code}`);
        }
    }

    // ==================== ASSIGN PERMISSIONS TO ROLES ====================
    // Get role IDs
    const adminRole = userDb.prepare("SELECT role_pk FROM roles WHERE role_code = 'admin'").get();
    const userRole = userDb.prepare("SELECT role_pk FROM roles WHERE role_code = 'user'").get();
    const viewerRole = userDb.prepare("SELECT role_pk FROM roles WHERE role_code = 'viewer'").get();
    const editorRole = userDb.prepare("SELECT role_pk FROM roles WHERE role_code = 'editor'").get();

    // Admin permissions (all permissions)
    const allPermissions = userDb.prepare("SELECT permission_pk FROM permissions").all();
    for (const perm of allPermissions) {
        const exists = userDb.prepare("SELECT role_permission_pk FROM role_permissions WHERE role_fk = ? AND permission_fk = ?")
            .get(adminRole.role_pk, perm.permission_pk);
        if (!exists) {
            userDb.prepare(`INSERT INTO role_permissions (role_fk, permission_fk) VALUES (?, ?)`).run(adminRole.role_pk, perm.permission_pk);
        }
    }
    logger.info('Admin role assigned all permissions');

    // User role permissions
    const userPermissions = ['user.view', 'bible.read', 'bible.search', 'format.rss', 'format.xml', 'format.json', 'format.txt', 'file.location.set', 'file.location.view'];
    for (const permCode of userPermissions) {
        const perm = userDb.prepare("SELECT permission_pk FROM permissions WHERE permission_code = ?").get(permCode);
        if (perm && userRole) {
            const exists = userDb.prepare("SELECT role_permission_pk FROM role_permissions WHERE role_fk = ? AND permission_fk = ?")
                .get(userRole.role_pk, perm.permission_pk);
            if (!exists) {
                userDb.prepare(`INSERT INTO role_permissions (role_fk, permission_fk) VALUES (?, ?)`).run(userRole.role_pk, perm.permission_pk);
            }
        }
    }
    logger.info('User role permissions assigned');

    // Viewer role permissions (read-only)
    const viewerPermissions = ['bible.read', 'bible.search'];
    for (const permCode of viewerPermissions) {
        const perm = userDb.prepare("SELECT permission_pk FROM permissions WHERE permission_code = ?").get(permCode);
        if (perm && viewerRole) {
            const exists = userDb.prepare("SELECT role_permission_pk FROM role_permissions WHERE role_fk = ? AND permission_fk = ?")
                .get(viewerRole.role_pk, perm.permission_pk);
            if (!exists) {
                userDb.prepare(`INSERT INTO role_permissions (role_fk, permission_fk) VALUES (?, ?)`).run(viewerRole.role_pk, perm.permission_pk);
            }
        }
    }
    logger.info('Viewer role permissions assigned');

    // Editor role permissions
    const editorPermissions = ['user.view', 'bible.read', 'bible.search', 'bible.export', 'format.rss', 'format.xml', 'format.json'];
    for (const permCode of editorPermissions) {
        const perm = userDb.prepare("SELECT permission_pk FROM permissions WHERE permission_code = ?").get(permCode);
        if (perm && editorRole) {
            const exists = userDb.prepare("SELECT role_permission_pk FROM role_permissions WHERE role_fk = ? AND permission_fk = ?")
                .get(editorRole.role_pk, perm.permission_pk);
            if (!exists) {
                userDb.prepare(`INSERT INTO role_permissions (role_fk, permission_fk) VALUES (?, ?)`).run(editorRole.role_pk, perm.permission_pk);
            }
        }
    }
    logger.info('Editor role permissions assigned');

    // ==================== INSERT DEFAULT BIBLE VERSIONS ====================
    const kjvExists = userDb.prepare("SELECT version_pk FROM bible_version WHERE version_code = 'KJV'").get();
    if (!kjvExists) {
        userDb.prepare(`
            INSERT INTO bible_version (version_code, version_name, db_path, language_code, language_name, copyright, book_table, book_pk, verse_table, verse_fk)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('KJV', 'King James Version', './db/kjv.db', 'en', 'English', 'Public Domain', 'kjv_book_name', 'kjv_book_name_pk', 'kjv_verses', 'kjv_book_name_fk');
        logger.info('KJV Bible version added');
    }

    const tamExists = userDb.prepare("SELECT version_pk FROM bible_version WHERE version_code = 'TAM'").get();
    if (!tamExists) {
        userDb.prepare(`
            INSERT INTO bible_version (version_code, version_name, db_path, language_code, language_name, copyright, book_table, book_pk, verse_table, verse_fk)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run('TAM', 'Tamil Bible', './db/tam.db', 'ta', 'Tamil', 'Public Domain', 'tam_book_name', 'tam_book_name_pk', 'tam_verses', 'tam_book_name_fk');
        logger.info('TAM Bible version added');
    }

    // ==================== INSERT DEFAULT FORMATS ====================
    const formats = [
        ['RSS_VERSE', 'RSS Verse Feed', 'rss', 1],
        ['RSS_REFERENCE', 'RSS Reference Feed', 'rss', 2],
        ['XML_BIBLESHOW', 'BibleShow XML', 'xml', 3],
        ['JSON_BIBLE', 'Bible JSON', 'json', 4],
        ['TXT_VERSE', 'Text Verse', 'txt', 5]
    ];

    for (const [code, name, type, order] of formats) {
        const formatExists = userDb.prepare("SELECT format_pk FROM available_formats WHERE format_code = ?").get(code);
        if (!formatExists) {
            userDb.prepare(`INSERT INTO available_formats (format_code, format_name, format_type, display_order) VALUES (?, ?, ?, ?)`).run(code, name, type, order);
            logger.info(`Format added: ${code}`);
        }
    }
}

async function createDefaultAdmin() {
    const adminExists = userDb.prepare("SELECT user_pk FROM user WHERE user_id = 'admin'").get();
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminRole = userDb.prepare("SELECT role_pk FROM roles WHERE role_code = 'admin'").get();
        
        userDb.prepare(`
            INSERT INTO user (user_id, password_hash, email, full_name, role_fk, is_active)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run('admin', hashedPassword, 'admin@example.com', 'System Administrator', adminRole?.role_pk || null, 1);

        // Assign all formats to admin
        const allFormats = userDb.prepare("SELECT format_pk FROM available_formats").all();
        for (const format of allFormats) {
            userDb.prepare(`INSERT OR IGNORE INTO user_format_permissions (user_fk, format_fk, is_active, granted_by) VALUES (?, ?, 1, 'system')`)
                .run(1, format.format_pk);
        }

        // Assign all versions to admin
        const allVersions = userDb.prepare("SELECT version_pk FROM bible_version").all();
        for (let i = 0; i < allVersions.length; i++) {
            const version = allVersions[i];
            const isDefault = i === 0 ? 1 : 0;
            userDb.prepare(`INSERT OR IGNORE INTO user_bible_mapping (user_fk, version_fk, is_default, is_active) VALUES (?, ?, ?, 1)`)
                .run(1, version.version_pk, isDefault);
        }

        logger.info('Default admin user created (username: admin, password: admin123)');
    }
}

// ==================== ROLE AND PERMISSION HELPER FUNCTIONS ====================

function getUserRole(userId) {
    const db = getUserDatabase();
    const user = db.prepare(`
        SELECT u.*, r.role_code, r.role_name, r.description as role_description
        FROM user u
        LEFT JOIN roles r ON r.role_pk = u.role_fk
        WHERE u.user_id = ?
    `).get(userId);
    return user;
}

function getUserPermissions(userId) {
    const db = getUserDatabase();
    const user = db.prepare("SELECT user_pk, role_fk FROM user WHERE user_id = ?").get(userId);
    if (!user) return [];
    
    // Get permissions from role
    const permissions = db.prepare(`
        SELECT DISTINCT p.permission_code, p.permission_name, p.module
        FROM role_permissions rp
        JOIN permissions p ON p.permission_pk = rp.permission_fk
        WHERE rp.role_fk = ? AND rp.is_active = 1
        ORDER BY p.module, p.permission_code
    `).all(user.role_fk);
    
    return permissions;
}

function userHasPermission(userId, permissionCode) {
    const permissions = getUserPermissions(userId);
    return permissions.some(p => p.permission_code === permissionCode);
}

function getAllRoles() {
    const db = getUserDatabase();
    return db.prepare(`
        SELECT r.*, COUNT(u.user_pk) as user_count
        FROM roles r
        LEFT JOIN user u ON u.role_fk = r.role_pk AND u.is_active = 1
        WHERE r.is_active = 1
        GROUP BY r.role_pk
        ORDER BY r.role_pk
    `).all();
}

function getRolePermissions(roleCode) {
    const db = getUserDatabase();
    return db.prepare(`
        SELECT p.permission_code, p.permission_name, p.module
        FROM role_permissions rp
        JOIN permissions p ON p.permission_pk = rp.permission_fk
        JOIN roles r ON r.role_pk = rp.role_fk
        WHERE r.role_code = ? AND rp.is_active = 1
        ORDER BY p.module, p.permission_code
    `).all(roleCode);
}

function assignRoleToUser(userId, roleCode) {
    const db = getUserDatabase();
    const role = db.prepare("SELECT role_pk FROM roles WHERE role_code = ?").get(roleCode);
    if (!role) throw new Error(`Role ${roleCode} not found`);
    
    const user = db.prepare("SELECT user_pk FROM user WHERE user_id = ?").get(userId);
    if (!user) throw new Error(`User ${userId} not found`);
    
    db.prepare("UPDATE user SET role_fk = ?, updated_date = CURRENT_TIMESTAMP WHERE user_pk = ?")
        .run(role.role_pk, user.user_pk);
    
    logger.info(`Role ${roleCode} assigned to user ${userId}`);
    return true;
}

// ==================== EXISTING HELPER FUNCTIONS ====================

// Clear user history on logout
function clearUserHistory(userId, sessionToken) {
    if (!userDb) return;

    const user = userDb.prepare("SELECT user_pk FROM user WHERE user_id = ?").get(userId);
    if (user) {
        const apiDeleted = userDb.prepare("DELETE FROM api_request_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, sessionToken);
        const rssDeleted = userDb.prepare("DELETE FROM rss_feed_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, sessionToken);
        logger.info(`Cleared history for user: ${userId} - API: ${apiDeleted.changes}, RSS: ${rssDeleted.changes}`);
    }
}

// Clear expired sessions (called by interval)
function clearExpiredSessions() {
    if (!userDb) return;

    const now = new Date().toISOString();
    const expiredUsers = userDb.prepare(`
        SELECT user_pk, user_id, session_token 
        FROM user 
        WHERE session_token IS NOT NULL AND session_expiry < ?
    `).all(now);

    for (const user of expiredUsers) {
        userDb.prepare("DELETE FROM api_request_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, user.session_token);
        userDb.prepare("DELETE FROM rss_feed_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, user.session_token);
        userDb.prepare("UPDATE user SET session_token = NULL, session_expiry = NULL WHERE user_pk = ?").run(user.user_pk);
        logger.info(`Cleared expired session for user: ${user.user_id}`);
    }

    if (expiredUsers.length > 0) {
        logger.info(`Cleared ${expiredUsers.length} expired sessions`);
    }
}

// Start session cleanup interval (runs every hour)
function startSessionCleanup() {
    setInterval(() => {
        clearExpiredSessions();
    }, 60 * 60 * 1000);
    logger.info('Session cleanup scheduler started (runs every hour)');
}

function getUserDatabase() {
    if (!userDb) initializeUserDatabase();
    return userDb;
}

function getVersionDatabase(versionCode, dbPath) {
    if (versionDbCache.has(versionCode)) {
        return versionDbCache.get(versionCode);
    }

    const fullPath = path.resolve(process.cwd(), dbPath);
    if (!fs.existsSync(fullPath)) {
        logger.warn(`Version database not found: ${fullPath}`);
        return null;
    }

    const versionDb = new Database(fullPath);
    versionDb.pragma('foreign_keys = ON');
    versionDbCache.set(versionCode, versionDb);
    logger.info(`Version database connected: ${versionCode}`);
    return versionDb;
}

function getDatabaseStats() {
    return {
        userDbConnected: userDb !== null,
        versionDbsConnected: versionDbCache.size,
        connectedVersions: Array.from(versionDbCache.keys())
    };
}

function closeAllDatabases() {
    if (userDb) userDb.close();
    for (const db of versionDbCache.values()) db.close();
    versionDbCache.clear();
    logger.info('All databases closed');
}

module.exports = {
    initializeUserDatabase,
    getUserDatabase,
    getVersionDatabase,
    clearUserHistory,
    clearExpiredSessions,
    getDatabaseStats,
    closeAllDatabases,
    // Role and permission functions
    getUserRole,
    getUserPermissions,
    userHasPermission,
    getAllRoles,
    getRolePermissions,
    assignRoleToUser
};