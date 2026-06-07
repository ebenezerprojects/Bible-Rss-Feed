const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const { checkVersionAccess } = require('../../middleware/versionAccess');
const bibleService = require('../../services/bibleService');
const { trackApiRequest } = require('../../utils/apiRequestTracker');

router.use(authenticate);
router.use('/:version/*', checkVersionAccess);

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
        
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;