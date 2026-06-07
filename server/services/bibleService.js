const { loadQuery } = require('../utils/queryLoader');
const { logger } = require('../config/logger');

// Complete book chapter and verse validation data
const BOOK_VALIDATION = {
    // Old Testament Books
    'GEN': { name: 'Genesis', chapters: 50, maxVerses: [31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20, 67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34, 31, 22, 33, 26] },
    'EXO': { name: 'Exodus', chapters: 40, maxVerses: [22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 37, 31, 33, 18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38] },
    'LEV': { name: 'Leviticus', chapters: 27, maxVerses: [17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23, 55, 46, 34] },
    'NUM': { name: 'Numbers', chapters: 36, maxVerses: [54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30, 25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13] },
    'DEU': { name: 'Deuteronomy', chapters: 34, maxVerses: [46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25, 22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12] },
    'JOS': { name: 'Joshua', chapters: 24, maxVerses: [18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33] },
    'JDG': { name: 'Judges', chapters: 21, maxVerses: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25] },
    'RUT': { name: 'Ruth', chapters: 4, maxVerses: [22, 23, 18, 22] },
    '1SA': { name: '1 Samuel', chapters: 31, maxVerses: [28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 15, 23, 29, 22, 44, 25, 12, 25, 11, 31, 13] },
    '2SA': { name: '2 Samuel', chapters: 24, maxVerses: [27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39, 25] },
    '1KI': { name: '1 Kings', chapters: 22, maxVerses: [53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 53] },
    '2KI': { name: '2 Kings', chapters: 25, maxVerses: [18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37, 20, 30] },
    '1CH': { name: '1 Chronicles', chapters: 29, maxVerses: [54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31, 31, 32, 34, 21, 30] },
    '2CH': { name: '2 Chronicles', chapters: 36, maxVerses: [17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21, 27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23] },
    'EZR': { name: 'Ezra', chapters: 10, maxVerses: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44] },
    'NEH': { name: 'Nehemiah', chapters: 13, maxVerses: [11, 20, 38, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31] },
    'EST': { name: 'Esther', chapters: 10, maxVerses: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3] },
    'JOB': { name: 'Job', chapters: 42, maxVerses: [22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17, 25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 32, 26, 17] },
    'PSA': { name: 'Psalms', chapters: 150, maxVerses: [6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12, 14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23, 19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 5, 7, 8, 7, 36, 5, 24, 19, 28, 10, 10, 72, 20, 13, 21, 16, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 9, 5, 22, 11, 10, 10, 9, 8, 9, 5, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6, 5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6] },
    'PRO': { name: 'Proverbs', chapters: 31, maxVerses: [33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35, 34, 28, 28, 27, 28, 27, 33, 31] },
    'ECC': { name: 'Ecclesiastes', chapters: 12, maxVerses: [18, 26, 22, 17, 20, 12, 29, 17, 18, 20, 10, 14] },
    'SNG': { name: 'Song of Solomon', chapters: 8, maxVerses: [17, 17, 11, 16, 16, 13, 13, 14] },
    'ISA': { name: 'Isaiah', chapters: 66, maxVerses: [31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 20, 28, 25, 13, 15, 22, 26, 11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 12, 25, 24] },
    'JER': { name: 'Jeremiah', chapters: 52, maxVerses: [19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40, 10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7, 47, 39, 46, 64, 34] },
    'LAM': { name: 'Lamentations', chapters: 5, maxVerses: [22, 22, 66, 22, 22] },
    'EZK': { name: 'Ezekiel', chapters: 48, maxVerses: [28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 44, 32, 31, 49, 27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23, 35] },
    'DAN': { name: 'Daniel', chapters: 12, maxVerses: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13] },
    'HOS': { name: 'Hosea', chapters: 14, maxVerses: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9] },
    'JOL': { name: 'Joel', chapters: 3, maxVerses: [20, 32, 21] },
    'AMO': { name: 'Amos', chapters: 9, maxVerses: [15, 16, 15, 13, 27, 14, 17, 14, 15] },
    'OBA': { name: 'Obadiah', chapters: 1, maxVerses: [21] },
    'JON': { name: 'Jonah', chapters: 4, maxVerses: [17, 10, 10, 11] },
    'MIC': { name: 'Micah', chapters: 7, maxVerses: [16, 13, 12, 13, 15, 16, 20] },
    'NAM': { name: 'Nahum', chapters: 3, maxVerses: [15, 13, 19] },
    'HAB': { name: 'Habakkuk', chapters: 3, maxVerses: [17, 20, 19] },
    'ZEP': { name: 'Zephaniah', chapters: 3, maxVerses: [18, 15, 20] },
    'HAG': { name: 'Haggai', chapters: 2, maxVerses: [15, 23] },
    'ZEC': { name: 'Zechariah', chapters: 14, maxVerses: [21, 17, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21] },
    'MAL': { name: 'Malachi', chapters: 4, maxVerses: [14, 17, 18, 6] },

    // New Testament Books
    'MAT': { name: 'Matthew', chapters: 28, maxVerses: [25, 23, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 46, 39, 51, 46, 75, 66, 20] },
    'MRK': { name: 'Mark', chapters: 16, maxVerses: [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20] },
    'LUK': { name: 'Luke', chapters: 24, maxVerses: [80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56, 53] },
    'JHN': { name: 'John', chapters: 21, maxVerses: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25] },
    'ACT': { name: 'Acts', chapters: 28, maxVerses: [26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35, 27, 27, 32, 44, 31] },
    'ROM': { name: 'Romans', chapters: 16, maxVerses: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27] },
    '1CO': { name: '1 Corinthians', chapters: 16, maxVerses: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24] },
    '2CO': { name: '2 Corinthians', chapters: 13, maxVerses: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14] },
    'GAL': { name: 'Galatians', chapters: 6, maxVerses: [24, 21, 29, 31, 26, 18] },
    'EPH': { name: 'Ephesians', chapters: 6, maxVerses: [23, 22, 21, 32, 33, 24] },
    'PHP': { name: 'Philippians', chapters: 4, maxVerses: [30, 30, 21, 23] },
    'COL': { name: 'Colossians', chapters: 4, maxVerses: [29, 23, 25, 18] },
    '1TH': { name: '1 Thessalonians', chapters: 5, maxVerses: [10, 20, 13, 18, 28] },
    '2TH': { name: '2 Thessalonians', chapters: 3, maxVerses: [12, 17, 18] },
    '1TI': { name: '1 Timothy', chapters: 6, maxVerses: [20, 15, 16, 16, 25, 21] },
    '2TI': { name: '2 Timothy', chapters: 4, maxVerses: [18, 26, 17, 22] },
    'TIT': { name: 'Titus', chapters: 3, maxVerses: [16, 15, 15] },
    'PHM': { name: 'Philemon', chapters: 1, maxVerses: [25] },
    'HEB': { name: 'Hebrews', chapters: 13, maxVerses: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25] },
    'JAS': { name: 'James', chapters: 5, maxVerses: [27, 26, 18, 17, 20] },
    '1PE': { name: '1 Peter', chapters: 5, maxVerses: [25, 25, 22, 19, 14] },
    '2PE': { name: '2 Peter', chapters: 3, maxVerses: [21, 22, 18] },
    '1JN': { name: '1 John', chapters: 5, maxVerses: [10, 29, 24, 21, 21] },
    '2JN': { name: '2 John', chapters: 1, maxVerses: [13] },
    '3JN': { name: '3 John', chapters: 1, maxVerses: [15] },
    'JUD': { name: 'Jude', chapters: 1, maxVerses: [25] },
    'REV': { name: 'Revelation', chapters: 22, maxVerses: [20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 18, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21] }
};

class BibleService {

    // Validate book, chapter, verse reference
    validateReference(bookCode, chapter, verse) {
        const book = BOOK_VALIDATION[bookCode.toUpperCase()];

        if (!book) {
            return { valid: false, error: `Invalid book code: ${bookCode}. Please use standard 3-letter book abbreviations.` };
        }

        const chapterNum = parseInt(chapter);
        if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > book.chapters) {
            return { valid: false, error: `Invalid chapter number for ${book.name}. Chapter must be between 1 and ${book.chapters}.` };
        }

        const verseNum = parseInt(verse);
        const maxVersesInChapter = book.maxVerses[chapterNum - 1];

        if (isNaN(verseNum) || verseNum < 1 || verseNum > maxVersesInChapter) {
            return { valid: false, error: `Invalid verse number for ${book.name} ${chapterNum}. Verse must be between 1 and ${maxVersesInChapter}.` };
        }

        return { valid: true, bookName: book.name, maxVerses: maxVersesInChapter };
    }

    // Validate range reference
    validateRange(bookCode, startChapter, startVerse, endChapter, endVerse) {
        const book = BOOK_VALIDATION[bookCode.toUpperCase()];

        if (!book) {
            return { valid: false, error: `Invalid book code: ${bookCode}` };
        }

        const startChap = parseInt(startChapter);
        const startVer = parseInt(startVerse);
        const endChap = parseInt(endChapter);
        const endVer = parseInt(endVerse);

        if (isNaN(startChap) || startChap < 1 || startChap > book.chapters) {
            return { valid: false, error: `Invalid start chapter. Must be between 1 and ${book.chapters}.` };
        }

        if (isNaN(endChap) || endChap < 1 || endChap > book.chapters) {
            return { valid: false, error: `Invalid end chapter. Must be between 1 and ${book.chapters}.` };
        }

        const maxStartVerses = book.maxVerses[startChap - 1];
        if (isNaN(startVer) || startVer < 1 || startVer > maxStartVerses) {
            return { valid: false, error: `Invalid start verse for ${book.name} ${startChap}. Verse must be between 1 and ${maxStartVerses}.` };
        }

        const maxEndVerses = book.maxVerses[endChap - 1];
        if (isNaN(endVer) || endVer < 1 || endVer > maxEndVerses) {
            return { valid: false, error: `Invalid end verse for ${book.name} ${endChap}. Verse must be between 1 and ${maxEndVerses}.` };
        }

        if (startChap > endChap || (startChap === endChap && startVer > endVer)) {
            return { valid: false, error: `Invalid range: Start reference must come before end reference.` };
        }

        return { valid: true, bookName: book.name };
    }

    // Validate chapter reference
    validateChapter(version, bookCode, chapter) {
        const book = BOOK_VALIDATION[bookCode.toUpperCase()];

        if (!book) {
            return { valid: false, error: `Invalid book code: ${bookCode}` };
        }

        const chapterNum = parseInt(chapter);
        if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > book.chapters) {
            return { valid: false, error: `Invalid chapter number for ${book.name}. Chapter must be between 1 and ${book.chapters}.` };
        }

        return { valid: true, bookName: book.name, maxVerses: book.maxVerses[chapterNum - 1] };
    }

    getSingleVerse(versionConfig, book, chapter, verse) {
        // Validate reference first
        const validation = this.validateReference(book, chapter, verse);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const db = versionConfig.db;
        const query = loadQuery('01_single_verse.sql', {
            version_code: versionConfig.version_code,
            verse_table: versionConfig.verse_table,
            book_table: versionConfig.book_table,
            book_pk: versionConfig.book_pk,
            verse_fk: versionConfig.verse_fk
        });

        const row = db.prepare(query).get({
            book_short_name: book.toUpperCase(),
            chapter: parseInt(chapter),
            verse: parseInt(verse)
        });

        if (!row) return null;

        return {
            version_code: versionConfig.version_code,
            book_short_name: row.book_short_name,
            book_name: row.book_name,
            chapter_num: row.chapter_num,
            verse_num: row.verse_num,
            verse: row.verse,
            reference: `${row.book_name} ${row.chapter_num}:${row.verse_num}`
        };
    }

    getVerseRange(versionConfig, params) {
        const { book, sc, sv, ec, ev } = params;

        // Validate range
        const validation = this.validateRange(book, sc, sv, ec, ev);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const db = versionConfig.db;
        const query = loadQuery('05_verse_range.sql', {
            verse_table: versionConfig.verse_table,
            book_table: versionConfig.book_table,
            book_pk: versionConfig.book_pk,
            verse_fk: versionConfig.verse_fk
        });

        const rows = db.prepare(query).all({
            book_short_name: book.toUpperCase(),
            start_chapter: parseInt(sc),
            start_verse: parseInt(sv),
            end_chapter: parseInt(ec),
            end_verse: parseInt(ev)
        });

        return {
            version: versionConfig.version_code,
            book: book.toUpperCase(),
            book_name: validation.bookName,
            range: `${sc}:${sv} - ${ec}:${ev}`,
            total_verses: rows.length,
            verses: rows
        };
    }

    getChapter(versionConfig, book, chapter) {
        // Validate chapter
        const validation = this.validateChapter(book, chapter);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        const db = versionConfig.db;
        const query = loadQuery('02_complete_chapter.sql', {
            verse_table: versionConfig.verse_table,
            book_table: versionConfig.book_table,
            book_pk: versionConfig.book_pk,
            verse_fk: versionConfig.verse_fk
        });

        const rows = db.prepare(query).all({
            book_short_name: book.toUpperCase(),
            chapter: parseInt(chapter)
        });

        return {
            version: versionConfig.version_code,
            book: book.toUpperCase(),
            book_name: validation.bookName,
            chapter: parseInt(chapter),
            total_verses: rows.length,
            max_verses_in_chapter: validation.maxVerses,
            verses: rows
        };
    }

    searchVerses(versionConfig, keyword, filters) {
        const db = versionConfig.db;
        const { testament, book, limit = 50 } = filters;

        let testamentFilter = '', bookFilter = '';
        const params = { keyword: `%${keyword}%`, limit: parseInt(limit) };

        if (testament) {
            testamentFilter = ` AND t.testament_name = :testament`;
            params.testament = `${testament} Testament`;
        }
        if (book) {
            // Validate book exists
            const bookValidation = this.validateChapter(book, 1);
            if (!bookValidation.valid) {
                throw new Error(bookValidation.error);
            }
            bookFilter = ` AND b.book_short_name = :book_short_name`;
            params.book_short_name = book.toUpperCase();
        }

        const query = loadQuery('04_word_search.sql', {
            verse_table: versionConfig.verse_table,
            book_table: versionConfig.book_table,
            book_pk: versionConfig.book_pk,
            verse_fk: versionConfig.verse_fk,
            testament_filter: testamentFilter,
            book_filter: bookFilter,
            range_filter: ''
        });

        const rows = db.prepare(query).all(params);

        return {
            version: versionConfig.version_code,
            keyword,
            total_results: rows.length,
            results: rows
        };
    }

    getBooks(versionConfig) {
        const db = versionConfig.db;
        const query = loadQuery('03_book_list.sql', { book_table: versionConfig.book_table });
        const books = db.prepare(query).all();

        const oldTestament = books.filter(b => b.testament_name === 'Old Testament');
        const newTestament = books.filter(b => b.testament_name === 'New Testament');

        return {
            version: versionConfig.version_code,
            version_name: versionConfig.version_name,
            old_testament: {
                count: oldTestament.length,
                books: oldTestament.map(({ book_global_id, book_number, book_name, book_short_name, chapter_count, testament_name, category_name }) => ({
                    book_global_id,
                    book_number,
                    book_name,
                    book_short_name,
                    chapter_count,
                    testament_name,
                    category_name
                }))
            },
            new_testament: {
                count: newTestament.length,
                books: newTestament.map(({ book_global_id, book_number, book_name, book_short_name, chapter_count, testament_name, category_name }) => ({
                    book_global_id,
                    book_number,
                    book_name,
                    book_short_name,
                    chapter_count,
                    testament_name,
                    category_name
                }))
            },
            total_books: books.length
        };
    }

    // Get book info for UI
    getBookInfo(bookCode) {
        const book = BOOK_VALIDATION[bookCode.toUpperCase()];
        if (!book) return null;

        return {
            code: bookCode.toUpperCase(),
            name: book.name,
            chapters: book.chapters,
            maxVersesByChapter: book.maxVerses
        };
    }

    // Get all books list for dropdown
    getAllBooks() {
        return Object.keys(BOOK_VALIDATION).map(code => ({
            code: code,
            name: BOOK_VALIDATION[code].name,
            chapters: BOOK_VALIDATION[code].chapters
        })).sort((a, b) => a.name.localeCompare(b.name));
    }
}

module.exports = new BibleService();