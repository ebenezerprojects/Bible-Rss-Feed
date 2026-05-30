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

// 4. Version List (from database)
router.get('/versions', (req, res) => {
    try {
        const db = getDatabase();
        const query = `
            SELECT 
                code,
                name,
                language_code,
                language_name,
                copyright,
                is_active,
                created_date
            FROM bible_version 
            WHERE is_active = 1
            ORDER BY version_pk
        `;

        const versions = db.prepare(query).all();
        res.json({
            versions: versions,
            total: versions.length,
            note: 'Versions loaded from bible_version table'
        });
    } catch (error) {
        handleError(res, error);
    }
});

// 5. Book List based on version (with Testament and Category segregation)
router.get('/:version/books', (req, res) => {
    const config = req.versionConfig;

    try {
        const db = getDatabase();
        const query = loadQuery('03_book_list.sql', {
            book_table: config.book_table
        });

        const books = db.prepare(query).all();

        const oldTestament = books.filter(b => b.testament_name === 'Old Testament');
        const newTestament = books.filter(b => b.testament_name === 'New Testament');

        // Group by category within testaments
        const oldTestamentByCategory = {};
        const newTestamentByCategory = {};

        oldTestament.forEach(book => {
            if (!oldTestamentByCategory[book.category_name]) {
                oldTestamentByCategory[book.category_name] = [];
            }
            oldTestamentByCategory[book.category_name].push(book);
        });

        newTestament.forEach(book => {
            if (!newTestamentByCategory[book.category_name]) {
                newTestamentByCategory[book.category_name] = [];
            }
            newTestamentByCategory[book.category_name].push(book);
        });

        res.json({
            version: config.code,
            version_name: config.name,
            version_language: config.language_name,
            version_copyright: config.copyright,
            old_testament: {
                count: oldTestament.length,
                books: oldTestament,
                by_category: oldTestamentByCategory
            },
            new_testament: {
                count: newTestament.length,
                books: newTestament,
                by_category: newTestamentByCategory
            },
            total_books: books.length
        });
    } catch (error) {
        handleError(res, error);
    }
});

module.exports = router;