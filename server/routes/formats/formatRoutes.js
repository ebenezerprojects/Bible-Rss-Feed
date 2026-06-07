const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../../middleware/auth');
const { checkFormatAccess } = require('../../middleware/formatAccess');
const { getUserDatabase } = require('../../config/database');
const fs = require('fs');
const path = require('path');

// Get user's available formats
router.get('/api/user/formats', authenticate, async (req, res) => {
    try {
        const db = getUserDatabase();
        const formats = db.prepare(`
            SELECT f.format_code, f.format_name, f.format_type
            FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = (SELECT user_pk FROM user WHERE user_id = ?) AND up.is_active = 1
        `).all(req.user.user_id);
        
        res.json({
            success: true,
            user_id: req.user.user_id,
            formats: formats
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// BibleShow XML format
router.get('/bibleshow/xml', authenticate, checkFormatAccess('XML_BIBLESHOW'), async (req, res) => {
    try {
        const db = getUserDatabase();
        const version = req.query.version || 'KJV';
        
        const latest = db.prepare(`
            SELECT r.* FROM rss_feed_history r
            JOIN user u ON u.user_pk = r.user_fk
            JOIN bible_version v ON v.version_pk = r.version_fk
            WHERE u.user_id = ? AND v.version_code = ? AND r.is_latest = 1
        `).get(req.user.user_id, version.toUpperCase());
        
        let xml;
        if (latest) {
            const escape = (s) => s ? s.replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])) : '';
            xml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<BibleShowData>
    <TimeCode>${Date.now()}</TimeCode>
    <Reference>${escape(latest.reference)}</Reference>
    <Scripture>${escape(latest.verse)}</Scripture>
    <BookName>${escape(latest.book_name)}</BookName>
    <ChapterNumber>${latest.chapter_num}</ChapterNumber>
    <VerseNumber>${latest.verse_num}</VerseNumber>
</BibleShowData>`;
        } else {
            xml = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<BibleShowData>
    <TimeCode>${Date.now()}</TimeCode>
    <Reference>No verse accessed yet</Reference>
    <Scripture>Make an API call to /api/:version/verse/:book/:chapter/:verse to see the verse here</Scripture>
</BibleShowData>`;
        }
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// JSON format
router.get('/bibleshow/json', authenticate, checkFormatAccess('JSON_BIBLE'), async (req, res) => {
    try {
        const db = getUserDatabase();
        
        const versions = db.prepare(`
            SELECT v.version_code FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = (SELECT user_pk FROM user WHERE user_id = ?) AND ubm.is_active = 1
        `).all(req.user.user_id);
        
        const data = {};
        for (const v of versions) {
            const latest = db.prepare(`
                SELECT reference, verse, accessed_at FROM rss_feed_history
                WHERE user_fk = (SELECT user_pk FROM user WHERE user_id = ?)
                AND version_fk = (SELECT version_pk FROM bible_version WHERE version_code = ?)
                ORDER BY accessed_at DESC LIMIT 1
            `).get(req.user.user_id, v.version_code);
            
            if (latest) {
                data[v.version_code.toLowerCase()] = {
                    reference: latest.reference,
                    verse_preview: latest.verse.substring(0, 200),
                    accessed_at: latest.accessed_at
                };
            }
        }
        
        res.json({
            success: true,
            user_id: req.user.user_id,
            timestamp: new Date().toISOString(),
            data: data
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Text files
router.get('/documents/users/:userId/:version/:filename', optionalAuth, checkFormatAccess('TXT_VERSE'), async (req, res) => {
    const { userId, version, filename } = req.params;
    const allowedFiles = ['verse.txt', 'ref.txt', 'verse_with_ref.txt', 'verse_info.json'];
    
    if (!allowedFiles.includes(filename)) {
        return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    const filePath = path.join(process.cwd(), 'documents/users', userId, version.toLowerCase(), filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            success: false,
            error: 'File not found',
            message: 'Make a verse API call first. The file will be auto-created.'
        });
    }
    
    const contentType = filename.endsWith('.json') ? 'application/json' : 'text/plain';
    res.header('Content-Type', contentType);
    res.sendFile(filePath);
});

module.exports = router;