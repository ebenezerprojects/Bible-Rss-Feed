/**
 * Helper Functions
 * Common utility functions used across the application
 */

const { getAllVersions } = require('../config/versions');

/**
 * Validate if the version exists and attach config to request
 * @param {Object} config - Version configuration object
 * @param {Object} res - Express response object
 * @returns {Object|null} - Error response or null if valid
 */
function validateVersion(config, res) {
    if (!config) {
        return res.status(404).json({
            success: false,
            error: 'Version not found',
            message: `The requested Bible version does not exist`,
            availableVersions: getAllVersions(),
            timestamp: new Date().toISOString()
        });
    }
    return null;
}

/**
 * Format API response with consistent structure
 * @param {*} data - Response data
 * @param {boolean} success - Success status (default: true)
 * @returns {Object} - Formatted response object
 */
function formatResponse(data, success = true) {
    return {
        success,
        data,
        timestamp: new Date().toISOString()
    };
}

/**
 * Handle errors with consistent response format
 * @param {Object} res - Express response object
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code (default: 500)
 * @returns {Object} - JSON error response
 */
function handleError(res, error, statusCode = 500) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
        console.error('Stack:', error.stack);
    }

    return res.status(statusCode).json({
        success: false,
        error: error.message || 'Internal server error',
        message: 'An error occurred while processing your request',
        timestamp: new Date().toISOString()
    });
}

/**
 * Handle not found errors
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (e.g., 'Verse', 'Book')
 * @param {string} identifier - Resource identifier
 * @returns {Object} - JSON not found response
 */
function handleNotFound(res, resource, identifier) {
    return res.status(404).json({
        success: false,
        error: 'Resource not found',
        message: `${resource} not found: ${identifier}`,
        timestamp: new Date().toISOString()
    });
}

/**
 * Validate required parameters
 * @param {Object} params - Object containing parameters to validate
 * @param {Array} required - Array of required parameter names
 * @returns {string|null} - Error message or null if valid
 */
function validateRequiredParams(params, required) {
    for (const param of required) {
        if (!params[param] && params[param] !== 0) {
            return `Missing required parameter: ${param}`;
        }
    }
    return null;
}

/**
 * Validate and parse integer parameter
 * @param {*} value - Value to parse
 * @param {string} paramName - Parameter name for error message
 * @param {Object} options - Options { min, max, defaultValue }
 * @returns {number} - Parsed integer or default value
 */
function parseIntParam(value, paramName, options = {}) {
    const { min, max, defaultValue } = options;
    let parsed = parseInt(value);

    if (isNaN(parsed)) {
        return defaultValue !== undefined ? defaultValue : null;
    }

    if (min !== undefined && parsed < min) {
        return defaultValue !== undefined ? defaultValue : min;
    }

    if (max !== undefined && parsed > max) {
        return defaultValue !== undefined ? defaultValue : max;
    }

    return parsed;
}

/**
 * Validate and parse string parameter
 * @param {*} value - Value to validate
 * @param {string} paramName - Parameter name for error message
 * @param {Object} options - Options { maxLength, pattern, defaultValue }
 * @returns {string|null} - Validated string or default
 */
function parseStringParam(value, paramName, options = {}) {
    const { maxLength, pattern, defaultValue, uppercase = false } = options;

    if (!value && value !== '') {
        return defaultValue !== undefined ? defaultValue : null;
    }

    let parsed = String(value).trim();

    if (uppercase) {
        parsed = parsed.toUpperCase();
    }

    if (maxLength && parsed.length > maxLength) {
        parsed = parsed.substring(0, maxLength);
    }

    if (pattern && !pattern.test(parsed)) {
        return defaultValue !== undefined ? defaultValue : null;
    }

    return parsed;
}

/**
 * Sanitize input to prevent SQL injection (additional layer)
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeInput(input) {
    if (!input) return '';
    return String(input)
        .replace(/[;'"`]/g, '')
        .replace(/--/g, '')
        .replace(/\/\*/g, '')
        .replace(/\*\//g, '');
}

/**
 * Extract book number from book short name or name
 * @param {string} bookIdentifier - Book short name or full name
 * @returns {Object} - { bookNumber, bookShortName, bookName }
 */
function parseBookIdentifier(bookIdentifier) {
    // Book short names mapping
    const bookMap = {
        'GEN': { number: 1, name: 'Genesis' },
        'EXO': { number: 2, name: 'Exodus' },
        'LEV': { number: 3, name: 'Leviticus' },
        'NUM': { number: 4, name: 'Numbers' },
        'DEU': { number: 5, name: 'Deuteronomy' },
        'JOS': { number: 6, name: 'Joshua' },
        'JDG': { number: 7, name: 'Judges' },
        'RUT': { number: 8, name: 'Ruth' },
        '1SA': { number: 9, name: '1 Samuel' },
        '2SA': { number: 10, name: '2 Samuel' },
        '1KI': { number: 11, name: '1 Kings' },
        '2KI': { number: 12, name: '2 Kings' },
        '1CH': { number: 13, name: '1 Chronicles' },
        '2CH': { number: 14, name: '2 Chronicles' },
        'EZR': { number: 15, name: 'Ezra' },
        'NEH': { number: 16, name: 'Nehemiah' },
        'EST': { number: 17, name: 'Esther' },
        'JOB': { number: 18, name: 'Job' },
        'PSA': { number: 19, name: 'Psalms' },
        'PRO': { number: 20, name: 'Proverbs' },
        'ECC': { number: 21, name: 'Ecclesiastes' },
        'SNG': { number: 22, name: 'Song of Solomon' },
        'ISA': { number: 23, name: 'Isaiah' },
        'JER': { number: 24, name: 'Jeremiah' },
        'LAM': { number: 25, name: 'Lamentations' },
        'EZK': { number: 26, name: 'Ezekiel' },
        'DAN': { number: 27, name: 'Daniel' },
        'HOS': { number: 28, name: 'Hosea' },
        'JOL': { number: 29, name: 'Joel' },
        'AMO': { number: 30, name: 'Amos' },
        'OBA': { number: 31, name: 'Obadiah' },
        'JON': { number: 32, name: 'Jonah' },
        'MIC': { number: 33, name: 'Micah' },
        'NAM': { number: 34, name: 'Nahum' },
        'HAB': { number: 35, name: 'Habakkuk' },
        'ZEP': { number: 36, name: 'Zephaniah' },
        'HAG': { number: 37, name: 'Haggai' },
        'ZEC': { number: 38, name: 'Zechariah' },
        'MAL': { number: 39, name: 'Malachi' },
        'MAT': { number: 40, name: 'Matthew' },
        'MRK': { number: 41, name: 'Mark' },
        'LUK': { number: 42, name: 'Luke' },
        'JHN': { number: 43, name: 'John' },
        'ACT': { number: 44, name: 'Acts' },
        'ROM': { number: 45, name: 'Romans' },
        '1CO': { number: 46, name: '1 Corinthians' },
        '2CO': { number: 47, name: '2 Corinthians' },
        'GAL': { number: 48, name: 'Galatians' },
        'EPH': { number: 49, name: 'Ephesians' },
        'PHP': { number: 50, name: 'Philippians' },
        'COL': { number: 51, name: 'Colossians' },
        '1TH': { number: 52, name: '1 Thessalonians' },
        '2TH': { number: 53, name: '2 Thessalonians' },
        '1TI': { number: 54, name: '1 Timothy' },
        '2TI': { number: 55, name: '2 Timothy' },
        'TIT': { number: 56, name: 'Titus' },
        'PHM': { number: 57, name: 'Philemon' },
        'HEB': { number: 58, name: 'Hebrews' },
        'JAS': { number: 59, name: 'James' },
        '1PE': { number: 60, name: '1 Peter' },
        '2PE': { number: 61, name: '2 Peter' },
        '1JN': { number: 62, name: '1 John' },
        '2JN': { number: 63, name: '2 John' },
        '3JN': { number: 64, name: '3 John' },
        'JUD': { number: 65, name: 'Jude' },
        'REV': { number: 66, name: 'Revelation' }
    };

    const upperIdentifier = bookIdentifier.toUpperCase();
    const found = bookMap[upperIdentifier];

    if (found) {
        return {
            bookNumber: found.number,
            bookShortName: upperIdentifier,
            bookName: found.name,
            valid: true
        };
    }

    // Try to find by name
    for (const [shortName, info] of Object.entries(bookMap)) {
        if (info.name.toUpperCase() === upperIdentifier) {
            return {
                bookNumber: info.number,
                bookShortName: shortName,
                bookName: info.name,
                valid: true
            };
        }
    }

    return {
        valid: false,
        error: 'Invalid book identifier'
    };
}

/**
 * Get pagination parameters
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {number} maxLimit - Maximum limit allowed
 * @returns {Object} - { offset, limit, page }
 */
function getPagination(page = 1, limit = 50, maxLimit = 100) {
    const parsedPage = Math.max(1, parseInt(page) || 1);
    let parsedLimit = Math.min(maxLimit, parseInt(limit) || 50);
    parsedLimit = Math.max(1, parsedLimit);

    return {
        offset: (parsedPage - 1) * parsedLimit,
        limit: parsedLimit,
        page: parsedPage
    };
}

/**
 * Generate cache key from request
 * @param {Object} req - Express request object
 * @returns {string} - Cache key
 */
function generateCacheKey(req) {
    const { originalUrl, query, params } = req;
    const key = `${originalUrl}:${JSON.stringify(query)}:${JSON.stringify(params)}`;
    return key.replace(/[^a-zA-Z0-9:]/g, '_');
}

/**
 * Calculate response time and log
 * @param {number} startTime - Start time in milliseconds
 * @returns {number} - Duration in milliseconds
 */
function logResponseTime(startTime, endpoint) {
    const duration = Date.now() - startTime;
    if (duration > 1000) {
        console.warn(`[Performance] Slow endpoint: ${endpoint} took ${duration}ms`);
    }
    return duration;
}

/**
 * Check if string is valid JSON
 * @param {string} str - String to check
 * @returns {boolean} - True if valid JSON
 */
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add (default: '...')
 * @returns {string} - Truncated string
 */
function truncateString(str, length = 100, suffix = '...') {
    if (!str) return '';
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Escape special characters for XML
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

/**
 * Escape special characters for JSON
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
function escapeJson(str) {
    if (!str) return '';
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

module.exports = {
    validateVersion,
    formatResponse,
    handleError,
    handleNotFound,
    validateRequiredParams,
    parseIntParam,
    parseStringParam,
    sanitizeInput,
    parseBookIdentifier,
    getPagination,
    generateCacheKey,
    logResponseTime,
    isValidJSON,
    truncateString,
    escapeXml,
    escapeJson
};