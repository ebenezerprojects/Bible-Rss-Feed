const jwt = require('jsonwebtoken');
const config = require('../config/index');

function generateToken(user, sessionId) {
    return jwt.sign(
        { 
            user_pk: user.user_pk, 
            user_id: user.user_id, 
            role: user.role,
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

module.exports = { generateToken, verifyToken };