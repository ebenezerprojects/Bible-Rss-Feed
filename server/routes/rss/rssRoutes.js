const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../../middleware/auth');
const { getUserDatabase } = require('../../config/database');
const RSS = require('rss');
const { logger } = require('../../config/logger');

// Verse RSS Feed
router.get('/rss/:userId/:version/verse', optionalAuth, async (req, res) => {
    try {
        const { userId, version } = req.params;
        const db = getUserDatabase();
        
        // Get user info
        const user = db.prepare('SELECT user_pk, user_id FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Get version info with access check
        const versionInfo = db.prepare(`
            SELECT v.* FROM bible_version v
            JOIN user_bible_mapping ubm ON ubm.version_fk = v.version_pk
            WHERE v.version_code = ? AND ubm.user_fk = ? AND ubm.is_active = 1
        `).get(version.toUpperCase(), user.user_pk);
        
        if (!versionInfo) {
            return res.status(403).json({ success: false, error: 'Version access denied' });
        }
        
        // Get recent verses from history
        const history = db.prepare(`
            SELECT reference, verse, book_name, book_short_name, chapter_num, verse_num, accessed_at
            FROM rss_feed_history
            WHERE user_fk = ? AND version_fk = ?
            ORDER BY accessed_at DESC LIMIT 20
        `).all(user.user_pk, versionInfo.version_pk);
        
        // Create RSS feed
        const feed = new RSS({
            title: `${versionInfo.version_name} - Bible Verses (${userId})`,
            description: `Latest Bible verses for ${userId} from ${versionInfo.version_name}`,
            feed_url: `http://localhost:3000/rss/${userId}/${version}/verse`,
            site_url: 'http://localhost:3000',
            language: versionInfo.language_code || 'en',
            copyright: versionInfo.copyright || `Bible API ${new Date().getFullYear()}`,
            pubDate: new Date().toUTCString(),
            ttl: 5,
            generator: 'Bible API RSS Generator'
        });
        
        // Add items to feed
        history.forEach(item => {
            feed.item({
                title: item.reference,
                description: item.verse.substring(0, 300) + (item.verse.length > 300 ? '...' : ''),
                url: `http://localhost:3000/api/${version}/verse/${item.book_short_name}/${item.chapter_num}/${item.verse_num}`,
                guid: `verse-${userId}-${version}-${item.accessed_at}`,
                categories: ['Bible', 'Verse', versionInfo.version_code],
                date: item.accessed_at,
                author: `${userId} (Bible API)`
            });
        });
        
        // If no history, add placeholder
        if (history.length === 0) {
            feed.item({
                title: 'No verses accessed yet',
                description: 'Make an API call to /api/:version/verse/:book/:chapter/:verse to see verses here',
                url: 'http://localhost:3000',
                guid: `empty-${userId}-${version}`,
                date: new Date().toUTCString()
            });
        }
        
        const rssContent = feed.xml({ indent: true });
        
        res.header('Content-Type', 'application/rss+xml');
        res.send(rssContent);
        
    } catch (error) {
        logger.error(`RSS verse feed error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reference RSS Feed
router.get('/rss/:userId/:version/reference', optionalAuth, async (req, res) => {
    try {
        const { userId, version } = req.params;
        const db = getUserDatabase();
        
        // Get user info
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Get version info with access check
        const versionInfo = db.prepare(`
            SELECT v.* FROM bible_version v
            JOIN user_bible_mapping ubm ON ubm.version_fk = v.version_pk
            WHERE v.version_code = ? AND ubm.user_fk = ? AND ubm.is_active = 1
        `).get(version.toUpperCase(), user.user_pk);
        
        if (!versionInfo) {
            return res.status(403).json({ success: false, error: 'Version access denied' });
        }
        
        // Get recent references from history
        const history = db.prepare(`
            SELECT reference, accessed_at
            FROM rss_feed_history
            WHERE user_fk = ? AND version_fk = ?
            ORDER BY accessed_at DESC LIMIT 20
        `).all(user.user_pk, versionInfo.version_pk);
        
        // Create RSS feed
        const feed = new RSS({
            title: `${versionInfo.version_name} - Bible References (${userId})`,
            description: `Latest Bible references for ${userId} from ${versionInfo.version_name}`,
            feed_url: `http://localhost:3000/rss/${userId}/${version}/reference`,
            site_url: 'http://localhost:3000',
            language: versionInfo.language_code || 'en',
            copyright: versionInfo.copyright || `Bible API ${new Date().getFullYear()}`,
            pubDate: new Date().toUTCString(),
            ttl: 5,
            generator: 'Bible API RSS Generator'
        });
        
        // Add items to feed
        history.forEach(item => {
            feed.item({
                title: item.reference,
                description: `${item.reference} - ${versionInfo.version_name}`,
                url: `http://localhost:3000/api/${version}/verse/...`,
                guid: `ref-${userId}-${version}-${item.accessed_at}`,
                categories: ['Bible', 'Reference', versionInfo.version_code],
                date: item.accessed_at
            });
        });
        
        // If no history, add placeholder
        if (history.length === 0) {
            feed.item({
                title: 'No references accessed yet',
                description: 'Make an API call to see references here',
                url: 'http://localhost:3000',
                guid: `empty-ref-${userId}-${version}`,
                date: new Date().toUTCString()
            });
        }
        
        const rssContent = feed.xml({ indent: true });
        
        res.header('Content-Type', 'application/rss+xml');
        res.send(rssContent);
        
    } catch (error) {
        logger.error(`RSS reference feed error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all RSS feeds list for a user
router.get('/rss/feeds', optionalAuth, async (req, res) => {
    try {
        const userId = req.user?.user_id || req.query.userId;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID required' 
            });
        }
        
        const db = getUserDatabase();
        
        // Get user's accessible versions
        const versions = db.prepare(`
            SELECT v.version_code, v.version_name, v.language_code
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = (SELECT user_pk FROM user WHERE user_id = ?) AND ubm.is_active = 1
        `).all(userId);
        
        const feeds = versions.map(version => ({
            version: version.version_code,
            name: version.version_name,
            language: version.language_code,
            verse_feed: `/rss/${userId}/${version.version_code.toLowerCase()}/verse`,
            reference_feed: `/rss/${userId}/${version.version_code.toLowerCase()}/reference`
        }));
        
        res.json({
            success: true,
            user_id: userId,
            total_feeds: feeds.length,
            feeds: feeds
        });
        
    } catch (error) {
        logger.error(`RSS feeds list error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;