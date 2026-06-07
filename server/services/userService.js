const { getUserDatabase } = require('../config/database');
const { comparePassword, generateToken } = require('../config/auth');
const { logger } = require('../config/logger');

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

class UserService {
    async login(userId, password) {
        const db = getUserDatabase();
        
        const user = db.prepare(`
            SELECT user_pk, user_id, password_hash, email, full_name, is_active, role
            FROM user WHERE user_id = ?
        `).get(userId);
        
        if (!user) throw new Error('Invalid credentials');
        if (!user.is_active) throw new Error('Account inactive');
        
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) throw new Error('Invalid credentials');
        
        // Generate session ID
        const sessionId = generateUUID();
        
        // Update last login and session token
        db.prepare("UPDATE user SET last_login = CURRENT_TIMESTAMP, session_token = ? WHERE user_pk = ?")
            .run(sessionId, user.user_pk);
        
        const token = generateToken(user, sessionId);
        
        // Get user's versions
        const versions = db.prepare(`
            SELECT v.version_code FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
        `).all(user.user_pk);
        
        // Get user's formats
        const formats = db.prepare(`
            SELECT f.format_code FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = ? AND up.is_active = 1
        `).all(user.user_pk);
        
        logger.info(`User logged in: ${userId}`);
        
        return {
            token,
            session_id: sessionId,
            user: {
                user_id: user.user_id,
                email: user.email,
                full_name: user.full_name,
                role: user.role
            },
            versions: versions.map(v => v.version_code),
            formats: formats.map(f => f.format_code)
        };
    }
}

module.exports = new UserService();