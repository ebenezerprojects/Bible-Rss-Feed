const express = require('express');
const router = express.Router();
const { getUserDatabase, clearUserHistory } = require('../../config/database');
const { comparePassword, generateToken } = require('../../config/auth');
const { authLimiter } = require('../../middleware/rateLimiter');
const { logger } = require('../../config/logger');

// Simple UUID generator
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Login
router.post('/login', authLimiter, async (req, res) => {
    try {
        const { user_id, password } = req.body;
        
        if (!user_id || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing credentials',
                message: 'user_id and password are required'
            });
        }
        
        const db = getUserDatabase();
        
        // Get user with role information from roles table
        const user = db.prepare(`
            SELECT 
                u.user_pk, 
                u.user_id, 
                u.password_hash, 
                u.email, 
                u.full_name, 
                u.is_active, 
                u.role_fk,
                r.role_code, 
                r.role_name,
                r.description as role_description
            FROM user u
            LEFT JOIN roles r ON r.role_pk = u.role_fk
            WHERE u.user_id = ?
        `).get(user_id);
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        if (!user.is_active) {
            return res.status(401).json({ success: false, error: 'Account is inactive. Contact administrator.' });
        }
        
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        // Generate session ID
        const sessionId = generateUUID();
        
        // Set session expiry (24 hours from now)
        const sessionExpiry = new Date();
        sessionExpiry.setHours(sessionExpiry.getHours() + 24);
        
        // Update last login, session token, and session expiry
        db.prepare("UPDATE user SET last_login = CURRENT_TIMESTAMP, session_token = ?, session_expiry = ? WHERE user_pk = ?")
            .run(sessionId, sessionExpiry.toISOString(), user.user_pk);
        
        const token = generateToken(user, sessionId);
        
        // Get user's versions
        const versions = db.prepare(`
            SELECT v.version_code, v.version_name, ubm.is_default
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
        `).all(user.user_pk);
        
        // Get user's formats
        const formats = db.prepare(`
            SELECT f.format_code
            FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = ? AND up.is_active = 1
        `).all(user.user_pk);
        
        // Get user's permissions from their role
        const permissions = db.prepare(`
            SELECT DISTINCT p.permission_code, p.permission_name, p.module
            FROM role_permissions rp
            JOIN permissions p ON p.permission_pk = rp.permission_fk
            WHERE rp.role_fk = ? AND rp.is_active = 1
        `).all(user.role_fk || 2); // Default to user role (2) if no role assigned
        
        logger.info(`User logged in: ${user_id}`);
        
        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                session_id: sessionId,
                session_expiry: sessionExpiry.toISOString(),
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role_code || 'user',
                    role_name: user.role_name || 'Standard User'
                },
                versions: versions.map(v => v.version_code),
                formats: formats.map(f => f.format_code),
                permissions: permissions.map(p => p.permission_code),
                expires_in: '24h'
            }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        console.error('Login error details:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Logout - clears user history for the session
router.post('/logout', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        
        const token = authHeader.substring(7);
        const { verifyToken } = require('../../config/auth');
        const decoded = verifyToken(token);
        
        if (decoded) {
            const db = getUserDatabase();
            
            // Clear API history for this user's session
            clearUserHistory(decoded.user_id, decoded.session_id);
            
            // Clear RSS feed history for this session
            const user = db.prepare("SELECT user_pk FROM user WHERE user_id = ?").get(decoded.user_id);
            if (user) {
                db.prepare("DELETE FROM rss_feed_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, decoded.session_id);
            }
            
            // Clear session token and expiry from user record
            db.prepare("UPDATE user SET session_token = NULL, session_expiry = NULL WHERE user_pk = ?").run(decoded.user_pk);
            
            logger.info(`User logged out and history cleared: ${decoded.user_id}`);
        }
        
        res.json({
            success: true,
            message: 'Logout successful. Your API history and RSS feed history have been cleared.'
        });
    } catch (error) {
        logger.error(`Logout error: ${error.message}`);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Check session validity
router.get('/check-session', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, error: 'No session found' });
        }
        
        const token = authHeader.substring(7);
        const { verifyToken } = require('../../config/auth');
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ success: false, error: 'Invalid token' });
        }
        
        const db = getUserDatabase();
        const user = db.prepare(`
            SELECT user_id, session_token, session_expiry 
            FROM user WHERE user_pk = ? AND session_token = ?
        `).get(decoded.user_pk, decoded.session_id);
        
        if (!user) {
            return res.status(401).json({ success: false, error: 'Session not found' });
        }
        
        const now = new Date();
        const expiry = new Date(user.session_expiry);
        
        if (now > expiry) {
            return res.status(401).json({ 
                success: false, 
                error: 'Session expired',
                message: 'Please login again'
            });
        }
        
        res.json({
            success: true,
            message: 'Session is valid',
            expires_at: user.session_expiry
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;