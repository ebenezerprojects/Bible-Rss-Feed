const { getUserDatabase } = require('../config/database');

const checkFormatAccess = (formatCode) => {
    return async (req, res, next) => {
        const userId = req.user?.user_id || req.params.userId;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        
        const db = getUserDatabase();
        const hasAccess = db.prepare(`
            SELECT up.permission_pk 
            FROM user_format_permissions up
            JOIN user u ON u.user_pk = up.user_fk
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE u.user_id = ? AND f.format_code = ? AND up.is_active = 1
        `).get(userId, formatCode);
        
        if (!hasAccess) {
            const availableFormats = db.prepare(`
                SELECT f.format_code FROM user_format_permissions up
                JOIN available_formats f ON f.format_pk = up.format_fk
                WHERE up.user_fk = (SELECT user_pk FROM user WHERE user_id = ?) AND up.is_active = 1
            `).all(userId);
            
            return res.status(403).json({
                success: false,
                error: 'Format access denied',
                message: `You don't have access to ${formatCode} format`,
                available_formats: availableFormats.map(f => f.format_code)
            });
        }
        
        next();
    };
};

module.exports = { checkFormatAccess };