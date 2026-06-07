const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const { getUserDatabase } = require('../../config/database');
const { logger } = require('../../config/logger');

router.use(authenticate);
router.use(requireRole(['admin']));

// Get all users
router.get('/users', async (req, res) => {
    try {
        const db = getUserDatabase();
        const users = db.prepare(`
            SELECT user_pk, user_id, email, full_name, role, is_active, last_login, created_date
            FROM user ORDER BY created_date DESC
        `).all();
        
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user details by ID
router.get('/users/:userId', async (req, res) => {
    try {
        const db = getUserDatabase();
        const user = db.prepare(`
            SELECT user_pk, user_id, email, full_name, role, is_active, last_login, created_date
            FROM user WHERE user_id = ?
        `).get(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Get user's versions
        const versions = db.prepare(`
            SELECT v.version_code, v.version_name, ubm.is_default
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
        `).all(user.user_pk);
        
        // Get user's formats
        const formats = db.prepare(`
            SELECT f.format_code, f.format_name
            FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = ? AND up.is_active = 1
        `).all(user.user_pk);
        
        res.json({
            success: true,
            data: {
                ...user,
                versions: versions.map(v => v.version_code),
                formats: formats.map(f => f.format_code)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Activate/deactivate user
router.patch('/users/:userId/toggle-status', async (req, res) => {
    try {
        const db = getUserDatabase();
        const user = db.prepare('SELECT is_active FROM user WHERE user_id = ?').get(req.params.userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        const newStatus = user.is_active ? 0 : 1;
        db.prepare("UPDATE user SET is_active = ? WHERE user_id = ?").run(newStatus, req.params.userId);
        
        logger.info(`User ${req.params.userId} status changed to ${newStatus ? 'active' : 'inactive'} by admin ${req.user.user_id}`);
        
        res.json({
            success: true,
            message: `User ${req.params.userId} ${newStatus ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get system statistics
router.get('/stats', async (req, res) => {
    try {
        const db = getUserDatabase();
        
        const userCount = db.prepare("SELECT COUNT(*) as count FROM user").get();
        const activeUserCount = db.prepare("SELECT COUNT(*) as count FROM user WHERE is_active = 1").get();
        const apiCallCount = db.prepare("SELECT COUNT(*) as count FROM api_request_history").get();
        const rssCount = db.prepare("SELECT COUNT(*) as count FROM rss_feed_history").get();
        
        res.json({
            success: true,
            data: {
                total_users: userCount.count,
                active_users: activeUserCount.count,
                total_api_calls: apiCallCount.count,
                total_verse_accesses: rssCount.count,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;