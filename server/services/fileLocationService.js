const fs = require('fs');
const path = require('path');
const { getUserDatabase } = require('../config/database');
const { logger } = require('../config/logger');

class FileLocationService {
    
    // Set or update file location for a user
    async setFileLocation(userId, locationType, filePath) {
        const db = getUserDatabase();
        
        // Validate location type
        if (!['txt', 'xml'].includes(locationType)) {
            throw new Error('Invalid location type. Must be "txt" or "xml"');
        }
        
        // Get user
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        // Validate and create directory if needed
        const fullPath = path.resolve(filePath);
        const directory = path.dirname(fullPath);
        
        if (!fs.existsSync(directory)) {
            try {
                fs.mkdirSync(directory, { recursive: true });
                logger.info(`Created directory: ${directory}`);
            } catch (error) {
                throw new Error(`Cannot create directory: ${error.message}`);
            }
        }
        
        // Check if file path is writable
        try {
            fs.accessSync(directory, fs.constants.W_OK);
        } catch (error) {
            throw new Error(`Directory is not writable: ${directory}`);
        }
        
        // Check if record exists
        const existing = db.prepare(`
            SELECT location_pk FROM user_file_locations 
            WHERE user_fk = ? AND location_type = ?
        `).get(user.user_pk, locationType);
        
        let result;
        if (existing) {
            // Update existing record
            result = db.prepare(`
                UPDATE user_file_locations 
                SET file_path = ?, updated_date = CURRENT_TIMESTAMP
                WHERE user_fk = ? AND location_type = ?
            `).run(fullPath, user.user_pk, locationType);
            
            logger.info(`Updated ${locationType} file location for user ${userId}: ${fullPath}`);
        } else {
            // Insert new record
            result = db.prepare(`
                INSERT INTO user_file_locations (user_fk, location_type, file_path)
                VALUES (?, ?, ?)
            `).run(user.user_pk, locationType, fullPath);
            
            logger.info(`Set ${locationType} file location for user ${userId}: ${fullPath}`);
        }
        
        return {
            success: true,
            user_id: userId,
            location_type: locationType,
            file_path: fullPath,
            action: existing ? 'updated' : 'created'
        };
    }
    
    // Get file location for a user
    async getFileLocation(userId, locationType) {
        const db = getUserDatabase();
        
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        const location = db.prepare(`
            SELECT file_path, created_date, updated_date
            FROM user_file_locations
            WHERE user_fk = ? AND location_type = ? AND is_active = 1
        `).get(user.user_pk, locationType);
        
        return location;
    }
    
    // Get both file locations for a user
    async getUserFileLocations(userId) {
        const db = getUserDatabase();
        
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        const locations = db.prepare(`
            SELECT location_type, file_path, created_date, updated_date
            FROM user_file_locations
            WHERE user_fk = ? AND is_active = 1
        `).all(user.user_pk);
        
        const result = {
            txt: null,
            xml: null
        };
        
        locations.forEach(loc => {
            result[loc.location_type] = {
                file_path: loc.file_path,
                created_date: loc.created_date,
                updated_date: loc.updated_date
            };
        });
        
        return result;
    }
    
    // Write verse to user's TXT file location
    async writeToTxtFile(userId, verseData) {
        const location = await this.getFileLocation(userId, 'txt');
        
        if (!location) {
            logger.warn(`No TXT location set for user ${userId}, skipping file write`);
            return false;
        }
        
        try {
            // Format content - only verse text, no reference (as requested)
            const content = verseData.verse;
            fs.writeFileSync(location.file_path, content, 'utf8');
            logger.info(`TXT file written for user ${userId}: ${location.file_path}`);
            return true;
        } catch (error) {
            logger.error(`Failed to write TXT file for user ${userId}: ${error.message}`);
            return false;
        }
    }
    
    // Write verse to user's XML file location (BibleShow format)
    async writeToXmlFile(userId, verseData, versionConfig) {
        const location = await this.getFileLocation(userId, 'xml');
        
        if (!location) {
            logger.warn(`No XML location set for user ${userId}, skipping file write`);
            return false;
        }
        
        try {
            const xml = this.generateBibleShowXML(verseData, versionConfig);
            fs.writeFileSync(location.file_path, xml, 'utf8');
            logger.info(`XML file written for user ${userId}: ${location.file_path}`);
            return true;
        } catch (error) {
            logger.error(`Failed to write XML file for user ${userId}: ${error.message}`);
            return false;
        }
    }
    
    generateBibleShowXML(verseData, versionConfig) {
        const escapeXml = (unsafe) => {
            if (!unsafe) return '';
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch(c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case "'": return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        };
        
        return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<BibleShowData>
    <TimeCode>${Date.now()}</TimeCode>
    <Reference>${escapeXml(verseData.reference)} (${versionConfig.version_code})</Reference>
    <Scripture>${escapeXml(verseData.verse)}</Scripture>
    <BibleVersion>${escapeXml(versionConfig.version_code)}</BibleVersion>
    <BibleCopyright>${escapeXml(versionConfig.copyright || 'Public Domain')}</BibleCopyright>
    <BibleLanguage>${escapeXml(versionConfig.language_name || 'English')}</BibleLanguage>
    <BookName>${escapeXml(verseData.book_name)}</BookName>
    <ChapterNumber>${verseData.chapter_num}</ChapterNumber>
    <VerseNumber>${verseData.verse_num}</VerseNumber>
</BibleShowData>`;
    }
    
    // Delete file location setting
    async deleteFileLocation(userId, locationType) {
        const db = getUserDatabase();
        
        const user = db.prepare('SELECT user_pk FROM user WHERE user_id = ?').get(userId);
        if (!user) {
            throw new Error('User not found');
        }
        
        const result = db.prepare(`
            DELETE FROM user_file_locations
            WHERE user_fk = ? AND location_type = ?
        `).run(user.user_pk, locationType);
        
        if (result.changes > 0) {
            logger.info(`Deleted ${locationType} file location for user ${userId}`);
            return { success: true, message: `File location deleted` };
        }
        
        return { success: false, message: `No file location found for ${locationType}` };
    }
    
    // Get file location statistics
    async getLocationStats() {
        const db = getUserDatabase();
        
        const stats = db.prepare(`
            SELECT 
                location_type,
                COUNT(*) as user_count
            FROM user_file_locations
            WHERE is_active = 1
            GROUP BY location_type
        `).all();
        
        return stats;
    }
    
    // Test if file location is writable
    async testFileLocation(userId, locationType) {
        const location = await this.getFileLocation(userId, locationType);
        
        if (!location) {
            return { success: false, message: 'No location configured' };
        }
        
        try {
            const testContent = `Test file write at ${new Date().toISOString()}`;
            fs.writeFileSync(location.file_path + '.test', testContent, 'utf8');
            fs.unlinkSync(location.file_path + '.test');
            return { success: true, message: 'Location is writable' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = new FileLocationService();