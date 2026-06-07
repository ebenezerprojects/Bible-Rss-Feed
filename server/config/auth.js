// server/config/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const config = require('./index');

function generateToken(user, sessionId) {
    return jwt.sign(
        { 
            user_pk: user.user_pk, 
            user_id: user.user_id, 
            role: user.role_code || 'user',
            session_id: sessionId 
        },
        config.auth.jwtSecret,
        { expiresIn: config.auth.jwtExpiresIn }
    );
}

function verifyToken(token) {
    try {
        return jwt.verify(token, config.auth.jwtSecret);
    } catch (error) {
        return null;
    }
}

async function hashPassword(password) {
    return bcrypt.hash(password, config.auth.bcryptRounds);
}

async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

async function getUserWithRole(userId) {
    const { getUserDatabase } = require('./database');
    const db = getUserDatabase();
    return db.prepare(`
        SELECT u.*, r.role_code, r.role_name, r.description as role_description
        FROM user u
        LEFT JOIN roles r ON r.role_pk = u.role_fk
        WHERE u.user_id = ?
    `).get(userId);
}

async function getUserPermissionsList(userId) {
    const { getUserDatabase } = require('./database');
    const db = getUserDatabase();
    
    const user = db.prepare("SELECT role_fk FROM user WHERE user_id = ?").get(userId);
    if (!user || !user.role_fk) return [];
    
    return db.prepare(`
        SELECT DISTINCT p.permission_code, p.permission_name, p.module
        FROM role_permissions rp
        JOIN permissions p ON p.permission_pk = rp.permission_fk
        WHERE rp.role_fk = ? AND rp.is_active = 1
        ORDER BY p.module, p.permission_code
    `).all(user.role_fk);
}

module.exports = {
    generateToken,
    verifyToken,
    hashPassword,
    comparePassword,
    getUserWithRole,
    getUserPermissionsList
};