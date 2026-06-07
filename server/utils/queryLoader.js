const fs = require('fs');
const path = require('path');

const queryCache = {};

// Get project root reliably by finding package.json
function getProjectRoot() {
    let currentDir = __dirname;
    
    // Traverse up until we find package.json
    while (currentDir !== path.parse(currentDir).root) {
        if (fs.existsSync(path.join(currentDir, 'package.json'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    
    // Fallback to cwd
    return process.cwd();
}

const PROJECT_ROOT = getProjectRoot();

// Possible SQL directory locations (in order of preference)
function getSqlPaths() {
    return [
        path.join(PROJECT_ROOT, 'sql'),                    // Main sql folder
        path.join(PROJECT_ROOT, 'server', 'sql'),          // Under server folder
        path.join(__dirname, '../sql'),                    // Relative from utils
        path.join(process.cwd(), 'sql')                    // Current working directory
    ];
}

function findSqlFile(filename) {
    const sqlPaths = getSqlPaths();
    
    for (const sqlPath of sqlPaths) {
        const fullPath = path.join(sqlPath, filename);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    
    // Build error message with all attempted paths
    const attemptedPaths = sqlPaths.map(p => path.join(p, filename));
    throw new Error(
        `\n❌ SQL file not found: ${filename}\n` +
        `   Searched in:\n${attemptedPaths.map(p => `     - ${p}`).join('\n')}\n` +
        `   Project root: ${PROJECT_ROOT}\n` +
        `   Please ensure the SQL file exists in the 'sql' folder at project root.\n`
    );
}

function loadQuery(filename, replacements = {}) {
    if (!queryCache[filename]) {
        const filePath = findSqlFile(filename);
        queryCache[filename] = fs.readFileSync(filePath, 'utf8');
        
        // Optional: Log in development only
        if (process.env.NODE_ENV === 'development') {
            console.log(`📄 Loaded SQL: ${filename}`);
        }
    }
    
    let query = queryCache[filename];
    
    // Apply replacements
    for (const [key, value] of Object.entries(replacements)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        query = query.replace(regex, value);
    }
    
    return query;
}

function clearQueryCache() {
    Object.keys(queryCache).forEach(key => delete queryCache[key]);
    console.log('🗑️ Query cache cleared');
}

function getQueryCacheStats() {
    return {
        cachedFiles: Object.keys(queryCache),
        projectRoot: PROJECT_ROOT,
        sqlPaths: getSqlPaths()
    };
}

module.exports = { 
    loadQuery, 
    clearQueryCache, 
    getQueryCacheStats 
};