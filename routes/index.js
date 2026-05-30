const express = require('express');
const router = express.Router();
const { BASE_URL } = require('../config/serverConfig');

// Import Bible routes
const verseRoutes = require('./bible/verseRoutes');
const bookRoutes = require('./bible/bookRoutes');
const searchRoutes = require('./bible/searchRoutes');

// Mount Bible routes
router.use(verseRoutes);
router.use(bookRoutes);
router.use(searchRoutes);

// Home route
router.get('/', (req, res) => {
    res.json({
        message: 'Bible API Running',
        documentation: `${BASE_URL}/api-docs`,
        timestamp: new Date().toISOString(),
        endpoints: {
            bible: {
                single_verse: {
                    method: 'GET',
                    url: `${BASE_URL}/:version/verse/:book/:chapter/:verse`,
                    example: `${BASE_URL}/kjv/verse/JHN/3/16`,
                    description: 'Get a single verse (UPDATES all formats)',
                    tracked: true
                },
                verse_range: {
                    method: 'GET',
                    url: `${BASE_URL}/:version/range/:book/:startChapter/:startVerse/:endChapter/:endVerse`,
                    example: `${BASE_URL}/kjv/range/JHN/3/1/3/16`,
                    description: 'Get a range of verses',
                    tracked: false
                },
                chapter: {
                    method: 'GET',
                    url: `${BASE_URL}/:version/chapter/:book/:chapter`,
                    example: `${BASE_URL}/kjv/chapter/JHN/3`,
                    description: 'Get complete chapter',
                    tracked: false
                },
                versions: {
                    method: 'GET',
                    url: `${BASE_URL}/versions`,
                    description: 'Get list of all available Bible versions',
                    tracked: false
                },
                books: {
                    method: 'GET',
                    url: `${BASE_URL}/:version/books`,
                    example: `${BASE_URL}/kjv/books`,
                    description: 'Get books list segregated by Old/New Testament',
                    tracked: false
                },
                word_search: {
                    method: 'GET',
                    url: `${BASE_URL}/:version/search/:keyword`,
                    example: `${BASE_URL}/kjv/search/love?testament=New&book=JHN&limit=10`,
                    description: 'Search with filters',
                    tracked: false
                }
            },
            formats: {
                json: {
                    method: 'GET',
                    url: `${BASE_URL}/bibleshow/json`,
                    description: 'JSON format for API integration',
                    content_type: 'application/json'
                },
                rss: {
                    method: 'GET',
                    url: `${BASE_URL}/rss/standard`,
                    description: 'Standard RSS 2.0 format (like Times of India)',
                    content_type: 'application/rss+xml'
                },
                bibleshow_xml: {
                    method: 'GET',
                    url: `${BASE_URL}/bibleshow/xml`,
                    description: 'Custom XML format for BibleShow software',
                    content_type: 'application/xml'
                },
                formats_info: {
                    method: 'GET',
                    url: `${BASE_URL}/formats`,
                    description: 'Get information about all available formats'
                }
            },
            system: {
                health: `${BASE_URL}/health`,
                network_info: `${BASE_URL}/network-info`,
                debug: `${BASE_URL}/debug (development only)`,
                api_history: `${BASE_URL}/api-history`,
                ws_info: `${BASE_URL}/ws-info`
            }
        }
    });
});

module.exports = router;