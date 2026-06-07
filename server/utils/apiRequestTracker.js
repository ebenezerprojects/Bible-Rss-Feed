const { getUserDatabase } = require('../config/database');
const { logger } = require('../config/logger');

function trackApiRequest(user, sessionId, requestUrl, endpointType, requestKey, startTime) {
    const db = getUserDatabase();
    const responseTime = Date.now() - startTime;
    
    try {
        db.prepare(`
            INSERT INTO api_request_history (user_fk, session_token, request_url, endpoint_type, request_key, response_time_ms)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(user.user_pk, sessionId, requestUrl, endpointType, requestKey || null, responseTime);
        
        logger.debug(`API tracked: ${user.user_id} - ${endpointType} - ${requestKey || ''}`);
    } catch (error) {
        logger.error(`Failed to track API request: ${error.message}`);
    }
}

function getUserHistory(userId, sessionId, limit = 50) {
    const db = getUserDatabase();
    const user = db.prepare("SELECT user_pk FROM user WHERE user_id = ?").get(userId);
    
    if (!user) return [];
    
    return db.prepare(`
        SELECT request_pk, request_url, endpoint_type, request_key, response_time_ms, requested_at
        FROM api_request_history
        WHERE user_fk = ? AND session_token = ?
        ORDER BY requested_at DESC LIMIT ?
    `).all(user.user_pk, sessionId, limit);
}

module.exports = { trackApiRequest, getUserHistory };