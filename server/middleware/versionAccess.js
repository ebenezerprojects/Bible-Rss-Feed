const { getUserDatabase, getVersionDatabase } = require('../config/database');

async function checkVersionAccess(req, res, next) {
    const { version } = req.params;
    const user = req.user;
    
    if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const db = getUserDatabase();
    const versionInfo = db.prepare(`
        SELECT * FROM bible_version WHERE version_code = ? AND is_active = 1
    `).get(version.toUpperCase());
    
    if (!versionInfo) {
        return res.status(404).json({ 
            success: false, 
            error: 'Version not found',
            message: `Bible version '${version}' does not exist`
        });
    }
    
    const userVersion = db.prepare(`
        SELECT * FROM user_bible_mapping
        WHERE user_fk = ? AND version_fk = ? AND is_active = 1
    `).get(user.user_pk, versionInfo.version_pk);
    
    if (!userVersion) {
        const availableVersions = db.prepare(`
            SELECT v.version_code FROM user_bible_mapping ubm
            JOIN bible_version v ON v.version_pk = ubm.version_fk
            WHERE ubm.user_fk = ? AND ubm.is_active = 1
        `).all(user.user_pk);
        
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: `You don't have access to version '${version}'`,
            available_versions: availableVersions.map(v => v.version_code)
        });
    }
    
    const versionDb = getVersionDatabase(versionInfo.version_code, versionInfo.db_path);
    if (!versionDb) {
        return res.status(500).json({ success: false, error: 'Database connection error' });
    }
    
    req.versionConfig = { ...versionInfo, db: versionDb };
    next();
}

module.exports = { checkVersionAccess };