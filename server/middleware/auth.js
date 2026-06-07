// server/middleware/auth.js
const { verifyToken, getUserWithRole } = require('../config/auth');
const { getUserDatabase } = require('../config/database');

async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
    
    const db = getUserDatabase();
    const user = db.prepare(`
        SELECT u.*, r.role_code, r.role_name
        FROM user u
        LEFT JOIN roles r ON r.role_pk = u.role_fk
        WHERE u.user_pk = ?
    `).get(decoded.user_pk);
    
    if (!user || !user.is_active) {
        return res.status(401).json({ success: false, error: 'User inactive or not found' });
    }
    
    // Check if session token matches
    if (user.session_token !== decoded.session_id) {
        return res.status(401).json({ success: false, error: 'Session invalid. Please login again.' });
    }
    
    // Check if session has expired
    const now = new Date();
    const expiry = new Date(user.session_expiry);
    
    if (now > expiry) {
        db.prepare("DELETE FROM api_request_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, user.session_token);
        db.prepare("DELETE FROM rss_feed_history WHERE user_fk = ? AND session_token = ?").run(user.user_pk, user.session_token);
        db.prepare("UPDATE user SET session_token = NULL, session_expiry = NULL WHERE user_pk = ?").run(user.user_pk);
        
        return res.status(401).json({ 
            success: false, 
            error: 'Session expired. Please login again.',
            message: 'Your session has expired and your history has been cleared.'
        });
    }
    
    req.user = user;
    req.token = token;
    req.sessionId = decoded.session_id;
    next();
}

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyToken(token);
        if (decoded) {
            const db = getUserDatabase();
            const user = db.prepare(`
                SELECT u.user_pk, u.user_id, u.role_fk, r.role_code
                FROM user u
                LEFT JOIN roles r ON r.role_pk = u.role_fk
                WHERE u.user_pk = ?
            `).get(decoded.user_pk);
            if (user && user.is_active) {
                req.user = user;
                req.sessionId = decoded.session_id;
            }
        }
    }
    next();
}

function requirePermission(permissionCode) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        
        const { getUserPermissionsList } = require('../config/auth');
        const permissions = await getUserPermissionsList(req.user.user_id);
        const hasPermission = permissions.some(p => p.permission_code === permissionCode);
        
        if (!hasPermission) {
            return res.status(403).json({ 
                success: false, 
                error: 'Permission denied',
                message: `You don't have permission to perform this action. Required: ${permissionCode}`
            });
        }
        
        next();
    };
}

function requireRole(roles) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
        if (!roles.includes(req.user.role_code)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Insufficient permissions',
                message: `Requires one of roles: ${roles.join(', ')}`
            });
        }
        next();
    };
}

module.exports = { authenticate, optionalAuth, requirePermission, requireRole };