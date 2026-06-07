const { getUserDatabase } = require('../config/database');
const { hashPassword } = require('../config/auth');
const { logger } = require('../config/logger');

class UserManagementService {
    
    async createUser(userData) {
        const db = getUserDatabase();
        const { user_id, password, email, full_name, role = 'user' } = userData;
        
        const existing = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(user_id);
        if (existing) {
            throw new Error(`User ${user_id} already exists`);
        }
        
        const passwordHash = await hashPassword(password);
        
        const stmt = db.prepare(`
            INSERT INTO user (user_id, password_hash, email, full_name, role)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(user_id, passwordHash, email, full_name, role);
        
        logger.info(`User created: ${user_id} by admin`);
        
        return {
            user_pk: result.lastInsertRowid,
            user_id,
            email,
            full_name,
            role
        };
    }
    
    async assignFormatsToUser(userId, formatCodes) {
        const db = getUserDatabase();
        
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        
        const assigned = [];
        const errors = [];
        
        for (const formatCode of formatCodes) {
            const format = db.prepare('SELECT format_pk FROM available_formats WHERE format_code = ?').get(formatCode);
            if (!format) {
                errors.push(`Format ${formatCode} not found`);
                continue;
            }
            
            db.prepare(`
                INSERT INTO user_format_permissions (user_fk, format_fk, is_active)
                VALUES (?, ?, 1)
                ON CONFLICT(user_fk, format_fk) DO UPDATE SET is_active = 1
            `).run(user.user_pk, format.format_pk);
            
            assigned.push(formatCode);
            logger.info(`Format ${formatCode} assigned to user ${userId}`);
        }
        
        return { assigned, errors };
    }
    
    async assignVersionsToUser(userId, versionCodes, defaultVersion = null) {
        const db = getUserDatabase();
        
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        
        const assigned = [];
        const errors = [];
        
        for (const versionCode of versionCodes) {
            const version = db.prepare('SELECT version_pk FROM bible_version WHERE version_code = ?').get(versionCode.toUpperCase());
            if (!version) {
                errors.push(`Version ${versionCode} not found`);
                continue;
            }
            
            const isDefault = (defaultVersion && defaultVersion.toUpperCase() === versionCode.toUpperCase()) ? 1 : 0;
            
            db.prepare(`
                INSERT INTO user_bible_mapping (user_fk, version_fk, is_default, is_active)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(user_fk, version_fk) DO UPDATE SET is_active = 1, is_default = ?
            `).run(user.user_pk, version.version_pk, isDefault, isDefault);
            
            assigned.push(versionCode);
            logger.info(`Version ${versionCode} assigned to user ${userId}`);
        }
        
        if (defaultVersion) {
            db.prepare(`
                UPDATE user_bible_mapping 
                SET is_default = 0 
                WHERE user_fk = ? AND version_fk != (
                    SELECT version_pk FROM bible_version WHERE version_code = ?
                )
            `).run(user.user_pk, defaultVersion.toUpperCase());
        }
        
        return { assigned, errors };
    }
    
    async getUserDetails(userId) {
        const db = getUserDatabase();
        
        const user = db.prepare(`
            SELECT user_pk, user_id, email, full_name, role, is_active, created_date
            FROM user WHERE user_id = ?
        `).get(userId);
        
        if (!user) {
            throw new Error(`User ${userId} not found`);
        }
        
        const formats = db.prepare(`
            SELECT f.format_code
            FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = ? AND up.is_active = 1
        `).all(user.user_pk);
        
        const versions = db.prepare(`
            SELECT v.version_code, v.version_name, ubm.is_default
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
        `).all(user.user_pk);
        
        return {
            ...user,
            formats: formats.map(f => f.format_code),
            versions: versions.map(v => ({
                code: v.version_code,
                name: v.version_name,
                is_default: v.is_default === 1
            }))
        };
    }
    
    async getAllFormats() {
        const db = getUserDatabase();
        return db.prepare('SELECT format_code, format_name, format_type FROM available_formats WHERE is_active = 1 ORDER BY format_pk').all();
    }
    
    async getAllVersions() {
        const db = getUserDatabase();
        return db.prepare('SELECT version_code, version_name, language_code, language_name, copyright FROM bible_version WHERE is_active = 1').all();
    }
}

module.exports = new UserManagementService();