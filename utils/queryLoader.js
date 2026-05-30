const fs = require('fs');
const path = require('path');

const queryCache = {};

function loadQuery(filename, replacements = {}) {
    const cacheKey = filename;

    if (!queryCache[cacheKey]) {
        const filePath = path.join(process.env.SQL_PATH || './sql', filename);
        try {
            let query = fs.readFileSync(filePath, 'utf8');
            queryCache[cacheKey] = query;
        } catch (error) {
            console.error(`Error loading query ${filename}:`, error.message);
            return null;
        }
    }

    let query = queryCache[cacheKey];

    for (const [key, value] of Object.entries(replacements)) {
        query = query.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return query;
}

function executeQuery(db, filename, replacements, params) {
    const query = loadQuery(filename, replacements);
    if (!query) return null;

    try {
        if (params) {
            return db.prepare(query).all(params);
        } else {
            return db.prepare(query).all();
        }
    } catch (error) {
        console.error(`Error executing query ${filename}:`, error.message);
        throw error;
    }
}

function executeSingleQuery(db, filename, replacements, params) {
    const query = loadQuery(filename, replacements);
    if (!query) return null;

    try {
        if (params) {
            return db.prepare(query).get(params);
        } else {
            return db.prepare(query).get();
        }
    } catch (error) {
        console.error(`Error executing query ${filename}:`, error.message);
        throw error;
    }
}

module.exports = {
    loadQuery,
    executeQuery,
    executeSingleQuery
};