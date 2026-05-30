const express = require('express');
const router = express.Router();
const { getDatabase } = require('../../config/database');
const { getVersionConfigSync, getActiveVersionsSync } = require('../../config/versions');
const { loadQuery } = require('../../utils/queryLoader');
const { handleError } = require('../../utils/helpers');

// Middleware to validate version and attach config
router.param('version', (req, res, next, version) => {
    const config = getVersionConfigSync(version);
    if (!config) {
        const activeVersions = getActiveVersionsSync();
        return res.status(404).json({
            error: 'Version not found',
            message: `Bible version '${version}' does not exist or is inactive`,
            availableVersions: activeVersions.map(v => v.key)
        });
    }
    req.versionConfig = config;
    next();
});

// 1. Single Verse Lookup (TRACKED for RSS & Text Files)
router.get('/:version/verse/:book/:chapter/:verse', (req, res) => {
    const { book, chapter, verse } = req.params;
    const config = req.versionConfig;

    try {
        const db = getDatabase();
        const query = loadQuery('01_single_verse.sql', {
            version_code: config.code,
            verse_table: config.verse_table,
            book_table: config.book_table,
            book_pk: config.book_pk,
            verse_fk: config.verse_fk
        });

        const row = db.prepare(query).get({
            book_short_name: book.toUpperCase(),
            chapter: parseInt(chapter),
            verse: parseInt(verse)
        });

        if (!row) {
            return res.status(404).json({ error: 'Verse not found' });
        }

        res.json(row);
    } catch (error) {
        handleError(res, error);
    }
});

// 2. Verse Range
router.get('/:version/range/:book/:startChapter/:startVerse/:endChapter/:endVerse', (req, res) => {
    const { book, startChapter, startVerse, endChapter, endVerse } = req.params;
    const config = req.versionConfig;

    try {
        const db = getDatabase();
        const query = loadQuery('05_verse_range.sql', {
            verse_table: config.verse_table,
            book_table: config.book_table,
            book_pk: config.book_pk,
            verse_fk: config.verse_fk
        });

        const rows = db.prepare(query).all({
            book_short_name: book.toUpperCase(),
            start_chapter: parseInt(startChapter),
            start_verse: parseInt(startVerse),
            end_chapter: parseInt(endChapter),
            end_verse: parseInt(endVerse)
        });

        res.json({
            version: config.code,
            book: book.toUpperCase(),
            range: `${startChapter}:${startVerse} - ${endChapter}:${endVerse}`,
            total_verses: rows.length,
            verses: rows
        });
    } catch (error) {
        handleError(res, error);
    }
});

// 3. Complete Chapter
router.get('/:version/chapter/:book/:chapter', (req, res) => {
    const { book, chapter } = req.params;
    const config = req.versionConfig;

    try {
        const db = getDatabase();
        const query = loadQuery('02_complete_chapter.sql', {
            verse_table: config.verse_table,
            book_table: config.book_table,
            book_pk: config.book_pk,
            verse_fk: config.verse_fk
        });

        const rows = db.prepare(query).all({
            book_short_name: book.toUpperCase(),
            chapter: parseInt(chapter)
        });

        res.json({
            version: config.code,
            book: book.toUpperCase(),
            chapter: parseInt(chapter),
            total_verses: rows.length,
            verses: rows
        });
    } catch (error) {
        handleError(res, error);
    }
});

// Get text files info (optional - for debugging)
router.get('/verse-files/info', (req, res) => {
    const { getCurrentVerse } = require('../../utils/txtWriter');
    const files = getCurrentVerse();
    res.json({
        verse: files.verse,
        reference: files.reference,
        updated_at: new Date().toISOString(),
        note: 'Only updated when /:version/verse/:book/:chapter/:verse is called'
    });
});

module.exports = router;