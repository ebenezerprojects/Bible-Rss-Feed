const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const backupService = require('../../services/backupService');

// All backup routes require admin access
router.use(authenticate);
router.use(requireRole(['admin']));

// Create manual backup
router.post('/backup/create', async (req, res) => {
    try {
        const result = await backupService.createManualBackup(req.user);
        
        res.json({
            success: true,
            message: 'Manual backup created successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get all backups list
router.get('/backup/list', async (req, res) => {
    try {
        const backups = await backupService.getAllBackups();
        
        res.json({
            success: true,
            data: backups,
            total: backups.length
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get backup information
router.get('/backup/info/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const info = await backupService.getBackupInfo(filename);
        
        res.json({
            success: true,
            data: info
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Download backup file
router.get('/backup/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        await backupService.downloadBackup(filename, res);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Delete backup file
router.delete('/backup/delete/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const result = await backupService.deleteBackup(filename, req.user);
        
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Get backup statistics
router.get('/backup/stats', async (req, res) => {
    try {
        const stats = await backupService.getBackupStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Clean old manual backups
router.post('/backup/clean', async (req, res) => {
    try {
        const { days = 30 } = req.body;
        const deletedCount = await backupService.cleanOldBackups(days);
        
        res.json({
            success: true,
            message: `Cleaned up ${deletedCount} old manual backups (older than ${days} days)`,
            deleted_count: deletedCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;