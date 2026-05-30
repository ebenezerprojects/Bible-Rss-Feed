/**
 * Version configurations - Dynamically loaded from database
 */

const { getDatabase } = require('./database');

// Cache for versions to avoid repeated DB calls
let versionsCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // Cache for 60 seconds

async function loadVersionsFromDB() {
    if (versionsCache && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL) {
        return versionsCache;
    }

    try {
        const db = getDatabase();
        const query = `
            SELECT 
                version_pk,
                code,
                name,
                language_code,
                language_name,
                copyright,
                book_table,
                book_pk,
                verse_table,
                verse_fk,
                is_active,
                created_date
            FROM bible_version 
            WHERE is_active = 1
            ORDER BY version_pk
        `;

        const rows = db.prepare(query).all();

        const versions = {};
        rows.forEach(row => {
            const key = row.code.toLowerCase();
            versions[key] = {
                pk: row.version_pk,
                code: row.code,
                name: row.name,
                language_code: row.language_code,
                language_name: row.language_name,
                copyright: row.copyright,
                book_table: row.book_table,
                book_pk: row.book_pk,
                verse_table: row.verse_table,
                verse_fk: row.verse_fk,
                is_active: row.is_active === 1,
                created_date: row.created_date
            };
        });

        versionsCache = versions;
        cacheTimestamp = Date.now();

        console.log(`[Versions] Loaded ${Object.keys(versions).length} versions from database`);
        return versions;
    } catch (error) {
        console.error('[Versions] Error loading versions from database:', error.message);
        return versionsCache || {};
    }
}

function getVersionsSync() {
    if (versionsCache) {
        return versionsCache;
    }

    try {
        const db = getDatabase();
        const query = `
            SELECT 
                code,
                name,
                language_code,
                language_name,
                copyright,
                book_table,
                book_pk,
                verse_table,
                verse_fk,
                is_active
            FROM bible_version 
            WHERE is_active = 1
        `;

        const rows = db.prepare(query).all();
        const versions = {};
        rows.forEach(row => {
            const key = row.code.toLowerCase();
            versions[key] = {
                code: row.code,
                name: row.name,
                language_code: row.language_code,
                language_name: row.language_name,
                copyright: row.copyright,
                book_table: row.book_table,
                book_pk: row.book_pk,
                verse_table: row.verse_table,
                verse_fk: row.verse_fk,
                is_active: row.is_active === 1
            };
        });

        versionsCache = versions;
        return versions;
    } catch (error) {
        console.error('[Versions] Error getting versions sync:', error.message);
        return {};
    }
}

async function getVersionConfig(version) {
    const versions = await loadVersionsFromDB();
    const config = versions[version?.toLowerCase()];
    if (!config) return null;
    return config;
}

function getVersionConfigSync(version) {
    const versions = getVersionsSync();
    const config = versions[version?.toLowerCase()];
    if (!config) return null;
    return config;
}

async function getAllVersions() {
    const versions = await loadVersionsFromDB();
    return Object.keys(versions);
}

function getAllVersionsSync() {
    const versions = getVersionsSync();
    return Object.keys(versions);
}

async function getActiveVersions() {
    const versions = await loadVersionsFromDB();
    return Object.entries(versions)
        .filter(([key, config]) => config.is_active)
        .map(([key, config]) => ({ key, ...config }));
}

function getActiveVersionsSync() {
    const versions = getVersionsSync();
    return Object.entries(versions)
        .filter(([key, config]) => config.is_active)
        .map(([key, config]) => ({ key, ...config }));
}

async function getVersionCodes() {
    const versions = await loadVersionsFromDB();
    return Object.values(versions).map(v => v.code);
}

function getVersionCodesSync() {
    const versions = getVersionsSync();
    return Object.values(versions).map(v => v.code);
}

function refreshCache() {
    versionsCache = null;
    cacheTimestamp = null;
    console.log('[Versions] Cache refreshed');
}

module.exports = {
    loadVersionsFromDB,
    getVersionsSync,
    getVersionConfig,
    getVersionConfigSync,
    getAllVersions,
    getAllVersionsSync,
    getActiveVersions,
    getActiveVersionsSync,
    getVersionCodes,
    getVersionCodesSync,
    refreshCache
};