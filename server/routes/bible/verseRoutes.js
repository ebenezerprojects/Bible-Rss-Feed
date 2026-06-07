const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkVersionAccess } = require('../../middleware/versionAccess');
const { getUserDatabase } = require('../../config/database');
const bibleService = require('../../services/bibleService');
const { logger } = require('../../config/logger');
const { trackApiRequest } = require('../../utils/apiRequestTracker');
const fileLocationService = require('../../services/fileLocationService');

router.use(authenticate);
router.use('/:version/*', checkVersionAccess);

// Get single verse (TRACKED - updates TXT and XML files)
router.get('/:version/verse/:book/:chapter/:verse', async (req, res) => {
    try {
        const { book, chapter, verse } = req.params;
        const { versionConfig, user, sessionId } = req;
        
        const startTime = Date.now();
        
        const verseData = await bibleService.getSingleVerse(versionConfig, book, chapter, verse);
        
        if (!verseData) {
            return res.status(404).json({ 
                success: false, 
                error: 'Verse not found',
                message: `The verse ${book.toUpperCase()} ${chapter}:${verse} was not found in the database.`
            });
        }
        
        // Track API request
        trackApiRequest(user, sessionId, req.originalUrl, 'verse', `${book} ${chapter}:${verse}`, startTime);
        
        // Track for RSS feed history with session token
        const db = getUserDatabase();
        db.prepare(`
            INSERT INTO rss_feed_history (user_fk, version_fk, reference, verse, book_name, book_short_name, chapter_num, verse_num, session_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            user.user_pk, versionConfig.version_pk,
            verseData.reference, verseData.verse, verseData.book_name,
            verseData.book_short_name, verseData.chapter_num, verseData.verse_num,
            sessionId
        );
        
        // Update is_latest flag
        db.prepare(`UPDATE rss_feed_history SET is_latest = 0 WHERE user_fk = ? AND version_fk = ? AND is_latest = 1`)
            .run(user.user_pk, versionConfig.version_pk);
        db.prepare(`UPDATE rss_feed_history SET is_latest = 1 WHERE user_fk = ? AND version_fk = ? AND rowid = last_insert_rowid()`)
            .run(user.user_pk, versionConfig.version_pk);
        
        // Write to user's configured TXT file location
        await fileLocationService.writeToTxtFile(user.user_id, verseData);
        
        // Write to user's configured XML file location
        await fileLocationService.writeToXmlFile(user.user_id, verseData, versionConfig);
        
        logger.info(`Verse accessed: ${user.user_id} - ${verseData.reference}`);
        res.json({ success: true, data: verseData });
    } catch (error) {
        logger.error(`Verse error: ${error.message}`);
        
        // Check if it's a validation error
        if (error.message.includes('Invalid') || error.message.includes('must be between')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Validation Error',
                message: error.message
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get verse range
router.get('/:version/range/:book/:startChapter/:startVerse/:endChapter/:endVerse', async (req, res) => {
    try {
        const { versionConfig, user, sessionId } = req;
        const startTime = Date.now();
        
        const result = await bibleService.getVerseRange(versionConfig, req.params);
        
        trackApiRequest(user, sessionId, req.originalUrl, 'range', 
            `${req.params.book} ${req.params.startChapter}:${req.params.startVerse}-${req.params.endChapter}:${req.params.endVerse}`, startTime);
        
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error(`Verse range error: ${error.message}`);
        
        if (error.message.includes('Invalid') || error.message.includes('must be between')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Validation Error',
                message: error.message
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get complete chapter
router.get('/:version/chapter/:book/:chapter', async (req, res) => {
    try {
        const { versionConfig, user, sessionId } = req;
        const startTime = Date.now();
        
        const result = await bibleService.getChapter(versionConfig, req.params.book, req.params.chapter);
        
        trackApiRequest(user, sessionId, req.originalUrl, 'chapter', 
            `${req.params.book} ${req.params.chapter}`, startTime);
        
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error(`Chapter error: ${error.message}`);
        
        if (error.message.includes('Invalid') || error.message.includes('must be between')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Validation Error',
                message: error.message
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search verses
router.get('/:version/search/:keyword', async (req, res) => {
    try {
        const { keyword } = req.params;
        const { testament, book, limit } = req.query;
        const { versionConfig, user, sessionId } = req;
        const startTime = Date.now();
        
        const result = await bibleService.searchVerses(versionConfig, keyword, {
            testament, book, limit
        });
        
        trackApiRequest(user, sessionId, req.originalUrl, 'search', `search:${keyword}`, startTime);
        
        res.json({ success: true, data: result });
    } catch (error) {
        logger.error(`Search error: ${error.message}`);
        
        if (error.message.includes('Invalid') || error.message.includes('must be between')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Validation Error',
                message: error.message
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get book info for dropdown
router.get('/books/list', async (req, res) => {
    try {
        const books = bibleService.getAllBooks();
        res.json({ success: true, data: books });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Validate a reference
router.post('/validate', async (req, res) => {
    try {
        const { book, chapter, verse } = req.body;
        const validation = bibleService.validateReference(book, chapter, verse);
        res.json({ success: true, data: validation });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;