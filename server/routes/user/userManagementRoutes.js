const express = require('express');
const router = express.Router();
const userManagementService = require('../../services/userManagementService');
const { authenticate, requireRole } = require('../../middleware/auth');
const { getUserDatabase } = require('../../config/database');
const config = require('../../config/index');

// ==================== NEW USER INFO API (AUTHENTICATED) ====================

// Get current user's complete information
router.get('/me', authenticate, async (req, res) => {
    try {
        const db = getUserDatabase();
        const userId = req.user.user_id;
        
        // Get user basic info
        const user = db.prepare(`
            SELECT user_pk, user_id, email, full_name, role, is_active, last_login, created_date
            FROM user WHERE user_id = ?
        `).get(userId);
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Get user's assigned Bible versions with full details
        const versions = db.prepare(`
            SELECT 
                v.version_code,
                v.version_name,
                v.language_code,
                v.language_name,
                v.copyright,
                ubm.is_default,
                ubm.is_active,
                ubm.assigned_date
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
        `).all(user.user_pk);
        
        // Get user's available formats with access links
        const formats = db.prepare(`
            SELECT 
                f.format_pk,
                f.format_code,
                f.format_name,
                f.format_type,
                up.access_level,
                up.granted_date,
                CASE 
                    WHEN f.format_code = 'RSS_VERSE' THEN '/rss/' || ? || '/' || lower(?) || '/verse'
                    WHEN f.format_code = 'RSS_REFERENCE' THEN '/rss/' || ? || '/' || lower(?) || '/reference'
                    WHEN f.format_code = 'XML_BIBLESHOW' THEN '/bibleshow/xml?version=' || lower(?)
                    WHEN f.format_code = 'JSON_BIBLE' THEN '/bibleshow/json'
                    WHEN f.format_code = 'TXT_VERSE' THEN '/documents/users/' || ? || '/' || lower(?) || '/verse.txt'
                    ELSE NULL
                END as access_url
            FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = ? AND up.is_active = 1
            ORDER BY f.format_type, f.format_code
        `).all(user.user_pk, userId, versions[0]?.version_code || 'kjv', userId, versions[0]?.version_code || 'kjv', versions[0]?.version_code || 'kjv', userId, versions[0]?.version_code || 'kjv');
        
        // Build access links for each format properly
        const formattedFormats = formats.map(format => {
            let accessUrl = null;
            const defaultVersion = versions.find(v => v.is_default === 1)?.version_code || (versions[0]?.version_code || 'KJV');
            const versionLower = defaultVersion.toLowerCase();
            
            switch(format.format_code) {
                case 'RSS_VERSE':
                    accessUrl = `${config.server.baseUrl}/rss/${userId}/${versionLower}/verse`;
                    break;
                case 'RSS_REFERENCE':
                    accessUrl = `${config.server.baseUrl}/rss/${userId}/${versionLower}/reference`;
                    break;
                case 'XML_BIBLESHOW':
                    accessUrl = `${config.server.baseUrl}/bibleshow/xml?version=${versionLower}`;
                    break;
                case 'JSON_BIBLE':
                    accessUrl = `${config.server.baseUrl}/bibleshow/json`;
                    break;
                case 'TXT_VERSE':
                    accessUrl = `${config.server.baseUrl}/documents/users/${userId}/${versionLower}/verse.txt`;
                    break;
                default:
                    accessUrl = null;
            }
            
            return {
                format_code: format.format_code,
                format_name: format.format_name,
                format_type: format.format_type,
                access_url: accessUrl,
                access_level: format.access_level,
                granted_date: format.granted_date
            };
        });
        
        // Build response
        const response = {
            success: true,
            data: {
                user_info: {
                    user_id: user.user_id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role,
                    is_active: user.is_active === 1,
                    last_login: user.last_login,
                    member_since: user.created_date
                },
                bible_versions: versions.map(v => ({
                    code: v.version_code,
                    name: v.version_name,
                    language_code: v.language_code,
                    language_name: v.language_name,
                    copyright: v.copyright,
                    is_default: v.is_default === 1,
                    api_endpoint: `${config.server.baseUrl}/api/${v.version_code.toLowerCase()}/verse/:book/:chapter/:verse`
                })),
                available_formats: formattedFormats,
                summary: {
                    total_bible_versions: versions.length,
                    total_formats: formattedFormats.length,
                    default_version: versions.find(v => v.is_default === 1)?.version_code || (versions[0]?.version_code || null)
                }
            }
        };
        
        res.json(response);
    } catch (error) {
        console.error('User info error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's available formats with access links only
router.get('/me/formats', authenticate, async (req, res) => {
    try {
        const db = getUserDatabase();
        const userId = req.user.user_id;
        
        // Get user's default version
        const defaultVersion = db.prepare(`
            SELECT v.version_code 
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_default = 1 AND ubm.is_active = 1
        `).get(req.user.user_pk);
        
        const versionCode = defaultVersion?.version_code || 'KJV';
        const versionLower = versionCode.toLowerCase();
        
        // Get user's formats with access links
        const formats = db.prepare(`
            SELECT 
                f.format_code,
                f.format_name,
                f.format_type,
                up.access_level,
                up.granted_date
            FROM user_format_permissions up
            JOIN available_formats f ON f.format_pk = up.format_fk
            WHERE up.user_fk = ? AND up.is_active = 1
            ORDER BY f.format_type, f.format_code
        `).all(req.user.user_pk);
        
        const formatsWithLinks = formats.map(format => {
            let accessUrl = null;
            let description = null;
            
            switch(format.format_code) {
                case 'RSS_VERSE':
                    accessUrl = `${config.server.baseUrl}/rss/${userId}/${versionLower}/verse`;
                    description = 'RSS feed of Bible verses (latest verses accessed)';
                    break;
                case 'RSS_REFERENCE':
                    accessUrl = `${config.server.baseUrl}/rss/${userId}/${versionLower}/reference`;
                    description = 'RSS feed of Bible references (latest references accessed)';
                    break;
                case 'XML_BIBLESHOW':
                    accessUrl = `${config.server.baseUrl}/bibleshow/xml?version=${versionLower}`;
                    description = 'BibleShow XML format for presentation software';
                    break;
                case 'JSON_BIBLE':
                    accessUrl = `${config.server.baseUrl}/bibleshow/json`;
                    description = 'JSON format for API integration';
                    break;
                case 'TXT_VERSE':
                    accessUrl = `${config.server.baseUrl}/documents/users/${userId}/${versionLower}/verse.txt`;
                    description = 'Plain text file containing the latest verse';
                    break;
                default:
                    accessUrl = null;
                    description = 'Format access available';
            }
            
            return {
                format_code: format.format_code,
                format_name: format.format_name,
                format_type: format.format_type,
                description: description,
                access_url: accessUrl,
                access_level: format.access_level,
                content_type: format.format_type === 'rss' ? 'application/rss+xml' : 
                             format.format_type === 'xml' ? 'application/xml' :
                             format.format_type === 'json' ? 'application/json' : 'text/plain'
            };
        });
        
        res.json({
            success: true,
            data: {
                user_id: userId,
                default_version: versionCode,
                formats: formatsWithLinks,
                total_formats: formatsWithLinks.length
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's Bible versions with access details
router.get('/me/versions', authenticate, async (req, res) => {
    try {
        const db = getUserDatabase();
        const userId = req.user.user_id;
        
        const versions = db.prepare(`
            SELECT 
                v.version_pk,
                v.version_code,
                v.version_name,
                v.language_code,
                v.language_name,
                v.copyright,
                ubm.is_default,
                ubm.is_active,
                ubm.assigned_date,
                (
                    SELECT COUNT(*) FROM rss_feed_history 
                    WHERE user_fk = ? AND version_fk = v.version_pk
                ) as total_accessed_verses
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
            ORDER BY ubm.is_default DESC, v.version_code
        `).all(req.user.user_pk, req.user.user_pk);
        
        const versionsWithDetails = versions.map(version => ({
            code: version.version_code,
            name: version.version_name,
            language: {
                code: version.language_code,
                name: version.language_name
            },
            copyright: version.copyright,
            is_default: version.is_default === 1,
            api_endpoint: `${config.server.baseUrl}/api/${version.version_code.toLowerCase()}/verse/{book}/{chapter}/{verse}`,
            example_endpoint: `${config.server.baseUrl}/api/${version.version_code.toLowerCase()}/verse/JHN/3/16`,
            total_verses_accessed: version.total_accessed_verses,
            assigned_date: version.assigned_date
        }));
        
        res.json({
            success: true,
            data: {
                user_id: userId,
                versions: versionsWithDetails,
                total_versions: versionsWithDetails.length,
                default_version: versionsWithDetails.find(v => v.is_default)?.code || null
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get user's dashboard summary
router.get('/me/dashboard', authenticate, async (req, res) => {
    try {
        const db = getUserDatabase();
        const userId = req.user.user_id;
        const userPk = req.user.user_pk;
        
        // Get user info
        const user = db.prepare(`
            SELECT user_id, email, full_name, role, last_login, created_date
            FROM user WHERE user_pk = ?
        `).get(userPk);
        
        // Get version count
        const versionCount = db.prepare(`
            SELECT COUNT(*) as count FROM user_bible_mapping 
            WHERE user_fk = ? AND is_active = 1
        `).get(userPk);
        
        // Get format count
        const formatCount = db.prepare(`
            SELECT COUNT(*) as count FROM user_format_permissions 
            WHERE user_fk = ? AND is_active = 1
        `).get(userPk);
        
        // Get recent verses accessed
        const recentVerses = db.prepare(`
            SELECT reference, book_name, chapter_num, verse_num, accessed_at
            FROM rss_feed_history
            WHERE user_fk = ? 
            ORDER BY accessed_at DESC LIMIT 5
        `).all(userPk);
        
        // Get API call statistics for current session
        const sessionStats = db.prepare(`
            SELECT 
                COUNT(*) as total_calls,
                COUNT(DISTINCT endpoint_type) as unique_endpoints,
                AVG(response_time_ms) as avg_response_time
            FROM api_request_history
            WHERE user_fk = ? AND session_token = ?
        `).get(userPk, req.sessionId);
        
        // Get default version
        const defaultVersion = db.prepare(`
            SELECT v.version_code, v.version_name
            FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_default = 1
        `).get(userPk);
        
        res.json({
            success: true,
            data: {
                user: {
                    user_id: user.user_id,
                    full_name: user.full_name,
                    email: user.email,
                    role: user.role,
                    member_since: user.created_date,
                    last_login: user.last_login
                },
                statistics: {
                    total_bible_versions: versionCount.count,
                    total_formats: formatCount.count,
                    session_api_calls: sessionStats?.total_calls || 0,
                    session_unique_endpoints: sessionStats?.unique_endpoints || 0,
                    avg_response_time: Math.round(sessionStats?.avg_response_time || 0)
                },
                default_version: defaultVersion ? {
                    code: defaultVersion.version_code,
                    name: defaultVersion.version_name,
                    api_url: `${config.server.baseUrl}/api/${defaultVersion.version_code.toLowerCase()}/verse/JHN/3/16`
                } : null,
                recent_verses: recentVerses,
                quick_links: {
                    rss_feed: `${config.server.baseUrl}/rss/${userId}/${defaultVersion?.version_code?.toLowerCase() || 'kjv'}/verse`,
                    bible_show_xml: `${config.server.baseUrl}/bibleshow/xml?version=${defaultVersion?.version_code?.toLowerCase() || 'kjv'}`,
                    json_data: `${config.server.baseUrl}/bibleshow/json`,
                    text_file: `${config.server.baseUrl}/documents/users/${userId}/${defaultVersion?.version_code?.toLowerCase() || 'kjv'}/verse.txt`
                }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== EXISTING ADMIN ROUTES BELOW ====================

// Create new user - Admin only
router.post('/create', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { user_id, password, email, full_name, role } = req.body;
        
        if (!user_id || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'user_id and password are required'
            });
        }
        
        const user = await userManagementService.createUser({
            user_id,
            password,
            email,
            full_name,
            role: role || 'user'
        });
        
        res.json({
            success: true,
            message: 'User created successfully',
            data: user
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Assign formats to user - Admin only
router.post('/assign-formats', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { user_id, format_codes } = req.body;
        
        if (!user_id || !format_codes || !Array.isArray(format_codes) || format_codes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'user_id and format_codes array are required'
            });
        }
        
        const result = await userManagementService.assignFormatsToUser(user_id, format_codes);
        
        res.json({
            success: true,
            message: 'Formats assigned successfully',
            data: result
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Assign versions to user - Admin only
router.post('/assign-versions', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { user_id, version_codes, default_version } = req.body;
        
        if (!user_id || !version_codes || !Array.isArray(version_codes) || version_codes.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request',
                message: 'user_id and version_codes array are required'
            });
        }
        
        const result = await userManagementService.assignVersionsToUser(user_id, version_codes, default_version);
        
        res.json({
            success: true,
            message: 'Versions assigned successfully',
            data: result
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get user details - Admin only (can view any user)
router.get('/:userId', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const userDetails = await userManagementService.getUserDetails(req.params.userId);
        res.json({ success: true, data: userDetails });
    } catch (error) {
        res.status(404).json({ success: false, error: error.message });
    }
});

// Get all available formats (public)
router.get('/formats/list', async (req, res) => {
    try {
        const formats = await userManagementService.getAllFormats();
        res.json({ success: true, data: formats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all available bible versions (public)
router.get('/versions/list', async (req, res) => {
    try {
        const versions = await userManagementService.getAllVersions();
        res.json({ success: true, data: versions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create user with formats and versions in one call - Admin only
router.post('/create-full', authenticate, requireRole(['admin']), async (req, res) => {
    try {
        const { user_id, password, email, full_name, format_codes, version_codes, default_version } = req.body;
        
        if (!user_id || !password) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                message: 'user_id and password are required'
            });
        }
        
        // Create user
        const user = await userManagementService.createUser({
            user_id,
            password,
            email,
            full_name,
            role: 'user'
        });
        
        // Assign formats if provided
        let formatResult = { assigned: [], errors: [] };
        if (format_codes && Array.isArray(format_codes) && format_codes.length > 0) {
            formatResult = await userManagementService.assignFormatsToUser(user_id, format_codes);
        }
        
        // Assign versions if provided
        let versionResult = { assigned: [], errors: [] };
        if (version_codes && Array.isArray(version_codes) && version_codes.length > 0) {
            versionResult = await userManagementService.assignVersionsToUser(user_id, version_codes, default_version);
        }
        
        res.json({
            success: true,
            message: 'User created with assignments',
            data: {
                user,
                formats_assigned: formatResult,
                versions_assigned: versionResult
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

module.exports = router;