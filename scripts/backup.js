const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { logger } = require('../config/logger');

const BACKUP_DIR = './backups';
const DB_DIR = './db';
const DOCUMENTS_DIR = './documents';

// Create backup directory if not exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `bible-api-backup-${timestamp}.zip`;
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
        const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        logger.info(`Backup completed: ${backupFileName} (${sizeMB} MB)`);
        console.log(`✅ Backup created: ${backupFileName} (${sizeMB} MB)`);
        
        // Clean old backups (keep last 7 days)
        cleanOldBackups();
    });
    
    archive.on('error', (err) => {
        logger.error(`Backup failed: ${err.message}`);
        console.error(`❌ Backup failed: ${err.message}`);
    });
    
    archive.pipe(output);
    
    // Add database files
    if (fs.existsSync(DB_DIR)) {
        const dbFiles = fs.readdirSync(DB_DIR);
        dbFiles.forEach(file => {
            if (file.endsWith('.db') || file.endsWith('.db-journal')) {
                const filePath = path.join(DB_DIR, file);
                archive.file(filePath, { name: `db/${file}` });
                console.log(`  📁 Added: db/${file}`);
            }
        });
    }
    
    // Add documents (user files)
    if (fs.existsSync(DOCUMENTS_DIR)) {
        archive.directory(DOCUMENTS_DIR, 'documents');
        console.log(`  📁 Added: documents/`);
    }
    
    // Add configuration files
    const configFiles = ['.env.dev', '.env.prod', 'package.json'];
    configFiles.forEach(file => {
        if (fs.existsSync(file)) {
            archive.file(file, { name: file });
            console.log(`  📁 Added: ${file}`);
        }
    });
    
    // Finalize archive
    archive.finalize();
}

function cleanOldBackups() {
    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    
    let deletedCount = 0;
    
    files.forEach(file => {
        if (file.endsWith('.zip')) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtimeMs < sevenDaysAgo) {
                fs.unlinkSync(filePath);
                deletedCount++;
                console.log(`  🗑️ Deleted old backup: ${file}`);
            }
        }
    });
    
    if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} old backups`);
    }
}

function listBackups() {
    const files = fs.readdirSync(BACKUP_DIR);
    const backups = [];
    
    files.forEach(file => {
        if (file.endsWith('.zip')) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            backups.push({
                name: file,
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                created: stats.mtime
            });
        }
    });
    
    backups.sort((a, b) => b.created - a.created);
    
    console.log('\n📦 Available Backups:');
    console.log('=' .repeat(60));
    backups.forEach(backup => {
        console.log(`  📄 ${backup.name}`);
        console.log(`     Size: ${backup.size} | Created: ${backup.created.toLocaleString()}`);
    });
    console.log('=' .repeat(60));
    console.log(`Total: ${backups.length} backup(s)\n`);
    
    return backups;
}

function restoreBackup(backupFileName) {
    const backupPath = path.join(BACKUP_DIR, backupFileName);
    
    if (!fs.existsSync(backupPath)) {
        console.error(`❌ Backup file not found: ${backupFileName}`);
        return false;
    }
    
    console.log(`⚠️  Restoring backup: ${backupFileName}`);
    console.log(`   This will overwrite existing data!`);
    console.log(`   Type 'YES' to continue:`);
    
    process.stdin.once('data', (data) => {
        const input = data.toString().trim();
        if (input !== 'YES') {
            console.log('❌ Restore cancelled');
            process.exit(0);
        }
        
        const extract = require('extract-zip');
        
        extract(backupPath, { dir: process.cwd() })
            .then(() => {
                console.log(`✅ Backup restored successfully: ${backupFileName}`);
                logger.info(`Restored backup: ${backupFileName}`);
                process.exit(0);
            })
            .catch((err) => {
                console.error(`❌ Restore failed: ${err.message}`);
                logger.error(`Restore failed: ${err.message}`);
                process.exit(1);
            });
    });
}

// Command line arguments
const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
    case 'backup':
    case 'create':
        console.log('📦 Creating backup...');
        createBackup();
        break;
    
    case 'list':
        listBackups();
        break;
    
    case 'restore':
        if (!arg) {
            console.log('Usage: node scripts/backup.js restore <backup-filename>');
            console.log('Example: node scripts/backup.js restore bible-api-backup-2024-01-01T12-00-00.zip');
            process.exit(1);
        }
        restoreBackup(arg);
        break;
    
    default:
        console.log(`
📦 Bible API Backup Utility

Usage:
  node scripts/backup.js backup     - Create a new backup
  node scripts/backup.js list       - List all backups
  node scripts/backup.js restore <file> - Restore from backup

Examples:
  node scripts/backup.js backup
  node scripts/backup.js list
  node scripts/backup.js restore bible-api-backup-2024-01-01T12-00-00.zip
        `);
        break;
}

module.exports = { createBackup, listBackups, restoreBackup, cleanOldBackups };