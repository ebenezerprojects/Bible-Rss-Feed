// server/routes/bible/bookRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkVersionAccess } = require('../../middleware/versionAccess');
const bibleService = require('../../services/bibleService');
const { trackApiRequest } = require('../../utils/apiRequestTracker');

// Apply authentication to ALL book routes
router.use(authenticate);

// Get books list for a specific version
router.get('/:version/books', checkVersionAccess, async (req, res) => {
    try {
        const { versionConfig, user, sessionId } = req;
        const startTime = Date.now();
        
        const result = await bibleService.getBooks(versionConfig);
        
        trackApiRequest(user, sessionId, req.originalUrl, 'books', 'books_list', startTime);
        
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Books error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get book info by code (authenticated)
router.get('/books/info/:bookCode', async (req, res) => {
    try {
        const { bookCode } = req.params;
        const bookInfo = bibleService.getBookInfo(bookCode);
        if (!bookInfo) {
            return res.status(404).json({ success: false, error: 'Book not found' });
        }
        res.json({ success: true, data: bookInfo });
    } catch (error) {
        console.error('Book info error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get max verse count for a specific chapter (authenticated)
router.get('/books/verse-count/:version/:bookCode/:chapter', async (req, res) => {
    try {
        const { version, bookCode, chapter } = req.params;
        const validation = bibleService.validateChapter(version, bookCode, chapter);
        if (!validation.valid) {
            return res.status(400).json({ success: false, error: validation.error });
        }
        res.json({ 
            success: true, 
            data: { 
                maxVerses: validation.maxVerses,
                bookName: validation.bookName 
            } 
        });
    } catch (error) {
        console.error('Verse count error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;