const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../config/database');
const { getVersionConfigSync, getActiveVersionsSync } = require('../../config/versions');
const { loadQuery } = require('../../utils/queryLoader');
const { handleError } = require('../../utils/helpers');

// Middleware for version validation
router.param('version', (req, res, next, version) => {
    const config = getVersionConfigSync(version);
    if (!config) {
        const activeVersions = getActiveVersionsSync();
        return res.status(404).json({
            error: 'Version not found',
            availableVersions: activeVersions.map(v => v.key)
        });
    }
    req.versionConfig = config;
    next();
});

// 6. Word Search with optional filters
router.get('/:version/search/:keyword', (req, res) => {
    const { keyword } = req.params;
    const { testament, book, book_start, book_end, limit = 50 } = req.query;
    const config = req.versionConfig;

    try {
        const db = getDatabase();

        let testamentFilter = '';
        let bookFilter = '';
        let rangeFilter = '';
        const params = { keyword: keyword, limit: parseInt(limit) };

        if (testament && (testament === 'Old' || testament === 'New')) {
            testamentFilter = ` AND t.testament_name = :testament`;
            params.testament = `${testament} Testament`;
        }

        if (book) {
            bookFilter = ` AND b.book_short_name = :book_short_name`;
            params.book_short_name = book.toUpperCase();
        }

        if (book_start && book_end) {
            rangeFilter = ` AND bd.book_number BETWEEN :book_start AND :book_end`;
            params.book_start = parseInt(book_start);
            params.book_end = parseInt(book_end);
        } else if (book_start) {
            rangeFilter = ` AND bd.book_number >= :book_start`;
            params.book_start = parseInt(book_start);
        } else if (book_end) {
            rangeFilter = ` AND bd.book_number <= :book_end`;
            params.book_end = parseInt(book_end);
        }

        const query = loadQuery('04_word_search.sql', {
            verse_table: config.verse_table,
            book_table: config.book_table,
            book_pk: config.book_pk,
            verse_fk: config.verse_fk,
            testament_filter: testamentFilter,
            book_filter: bookFilter,
            range_filter: rangeFilter
        });

        const rows = db.prepare(query).all(params);

        res.json({
            version: config.code,
            version_name: config.name,
            keyword: keyword,
            filters: { testament, book, book_start, book_end, limit: parseInt(limit) },
            total_results: rows.length,
            results: rows
        });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;