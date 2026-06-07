const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { logger } = require('../config/logger');

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const DB_DIR = path.join(process.cwd(), 'db');
const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');
const CONFIG_FILES = ['.env.dev', '.env.prod', 'package.json'];

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

class BackupService {
    constructor() {
        this.backupHistory = [];
        this.loadBackupHistory();
        this.startAutoBackup();
    }

    loadBackupHistory() {
        const historyFile = path.join(BACKUP_DIR, 'backup-history.json');
        if (fs.existsSync(historyFile)) {
            try {
                this.backupHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
            } catch (error) {
                this.backupHistory = [];
            }
        }
    }

    saveBackupHistory() {
        const historyFile = path.join(BACKUP_DIR, 'backup-history.json');
        fs.writeFileSync(historyFile, JSON.stringify(this.backupHistory, null, 2));
    }

    startAutoBackup() {
        // Run backup every 30 minutes (1800000 milliseconds)
        setInterval(() => {
            this.createAutoBackup();
        }, 30 * 60 * 1000);
        
        logger.info('Auto backup scheduler started (every 30 minutes)');
        console.log('🔄 Auto backup scheduled every 30 minutes');
    }

    async createAutoBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFileName = `auto-backup-${timestamp}.zip`;
            const backupPath = path.join(BACKUP_DIR, backupFileName);
            
            await this.performBackup(backupPath, backupFileName, 'auto');
            
            // Keep only last 10 auto backups
            await this.cleanOldAutoBackups();
            
            logger.info(`Auto backup created: ${backupFileName}`);
            console.log(`🔄 Auto backup created: ${backupFileName}`);
        } catch (error) {
            logger.error(`Auto backup failed: ${error.message}`);
        }
    }

    async createManualBackup(adminUser) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFileName = `manual-backup-${timestamp}.zip`;
        const backupPath = path.join(BACKUP_DIR, backupFileName);
        
        const result = await this.performBackup(backupPath, backupFileName, 'manual', adminUser);
        
        return result;
    }

    performBackup(backupPath, backupFileName, type, adminUser = null) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(backupPath);
            const archive = archiver('zip', { zlib: { level: 9 } });
            
            let fileCount = 0;
            
            output.on('close', () => {
                const backupSize = archive.pointer();
                
                // Record backup in history
                const backupRecord = {
                    id: Date.now(),
                    filename: backupFileName,
                    size: (backupSize / 1024 / 1024).toFixed(2) + ' MB',
                    type: type,
                    created_by: adminUser?.user_id || 'system',
                    created_at: new Date().toISOString(),
                    file_count: fileCount
                };
                
                this.backupHistory.unshift(backupRecord);
                
                // Keep only last 50 records
                if (this.backupHistory.length > 50) {
                    this.backupHistory = this.backupHistory.slice(0, 50);
                }
                
                this.saveBackupHistory();
                
                logger.info(`Backup completed: ${backupFileName} (${backupRecord.size})`);
                resolve({
                    success: true,
                    filename: backupFileName,
                    size: backupRecord.size,
                    created_at: backupRecord.created_at
                });
            });
            
            archive.on('error', (err) => {
                logger.error(`Backup failed: ${err.message}`);
                reject(err);
            });
            
            archive.pipe(output);
            
            // Add database files
            if (fs.existsSync(DB_DIR)) {
                const dbFiles = fs.readdirSync(DB_DIR);
                dbFiles.forEach(file => {
                    if (file.endsWith('.db') || file.endsWith('.db-journal') || file.endsWith('.db-wal') || file.endsWith('.db-shm')) {
                        const filePath = path.join(DB_DIR, file);
                        const stats = fs.statSync(filePath);
                        if (stats.size > 0) {
                            archive.file(filePath, { name: `db/${file}` });
                            fileCount++;
                        }
                    }
                });
            }
            
            // Add documents (user files)
            if (fs.existsSync(DOCUMENTS_DIR)) {
                archive.directory(DOCUMENTS_DIR, 'documents');
            }
            
            // Add configuration files
            CONFIG_FILES.forEach(file => {
                if (fs.existsSync(file)) {
                    archive.file(file, { name: file });
                }
            });
            
            archive.finalize();
        });
    }

    async cleanOldAutoBackups() {
        const files = fs.readdirSync(BACKUP_DIR);
        const autoBackups = files.filter(f => f.startsWith('auto-backup-') && f.endsWith('.zip'));
        
        // Keep only last 10 auto backups
        if (autoBackups.length > 10) {
            const sorted = autoBackups.sort().reverse();
            const toDelete = sorted.slice(10);
            
            for (const file of toDelete) {
                const filePath = path.join(BACKUP_DIR, file);
                fs.unlinkSync(filePath);
                logger.info(`Deleted old auto backup: ${file}`);
            }
        }
    }

    async cleanOldBackups(daysToKeep = 30) {
        const files = fs.readdirSync(BACKUP_DIR);
        const now = Date.now();
        const cutoffDate = now - (daysToKeep * 24 * 60 * 60 * 1000);
        
        let deletedCount = 0;
        
        for (const file of files) {
            if (file.endsWith('.zip') && !file.startsWith('auto-backup-')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                
                if (stats.mtimeMs < cutoffDate) {
                    fs.unlinkSync(filePath);
                    deletedCount++;
                    
                    // Remove from history
                    this.backupHistory = this.backupHistory.filter(b => b.filename !== file);
                }
            }
        }
        
        if (deletedCount > 0) {
            this.saveBackupHistory();
            logger.info(`Cleaned up ${deletedCount} old manual backups`);
        }
        
        return deletedCount;
    }

    async getAllBackups() {
        const backups = [];
        const files = fs.readdirSync(BACKUP_DIR);
        
        for (const file of files) {
            if (file.endsWith('.zip')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                
                const historyRecord = this.backupHistory.find(b => b.filename === file);
                
                backups.push({
                    filename: file,
                    size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                    created_at: stats.mtime,
                    type: file.startsWith('auto-') ? 'auto' : 'manual',
                    created_by: historyRecord?.created_by || (file.startsWith('auto-') ? 'system' : 'unknown')
                });
            }
        }
        
        backups.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return backups;
    }

    async getBackupInfo(filename) {
        const filePath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error('Backup file not found');
        }
        
        const stats = fs.statSync(filePath);
        const historyRecord = this.backupHistory.find(b => b.filename === filename);
        
        return {
            filename: filename,
            size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
            created_at: stats.mtime,
            type: filename.startsWith('auto-') ? 'auto' : 'manual',
            created_by: historyRecord?.created_by || (filename.startsWith('auto-') ? 'system' : 'unknown'),
            file_count: historyRecord?.file_count || 0
        };
    }

    async downloadBackup(filename, res) {
        const filePath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error('Backup file not found');
        }
        
        res.download(filePath, filename, (err) => {
            if (err) {
                logger.error(`Backup download error: ${err.message}`);
            }
        });
    }

    async deleteBackup(filename, adminUser) {
        const filePath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error('Backup file not found');
        }
        
        fs.unlinkSync(filePath);
        
        this.backupHistory = this.backupHistory.filter(b => b.filename !== filename);
        this.saveBackupHistory();
        
        logger.info(`Backup deleted: ${filename} by ${adminUser.user_id}`);
        
        return { success: true, message: `Backup ${filename} deleted successfully` };
    }

    async getBackupStats() {
        const backups = await this.getAllBackups();
        const totalSize = backups.reduce((sum, b) => {
            const sizeInMB = parseFloat(b.size);
            return sum + (isNaN(sizeInMB) ? 0 : sizeInMB);
        }, 0);
        
        const autoBackups = backups.filter(b => b.type === 'auto').length;
        const manualBackups = backups.filter(b => b.type === 'manual').length;
        
        const backupDirSize = this.getDirectorySize(BACKUP_DIR);
        
        return {
            total_backups: backups.length,
            auto_backups: autoBackups,
            manual_backups: manualBackups,
            total_size: totalSize.toFixed(2) + ' MB',
            backup_directory_size: (backupDirSize / 1024 / 1024).toFixed(2) + ' MB',
            oldest_backup: backups[backups.length - 1]?.created_at || null,
            newest_backup: backups[0]?.created_at || null,
            auto_backup_interval: '30 minutes'
        };
    }

    getDirectorySize(directory) {
        let size = 0;
        const files = fs.readdirSync(directory);
        
        for (const file of files) {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isDirectory()) {
                size += this.getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        }
        
        return size;
    }
}

module.exports = new BackupService();