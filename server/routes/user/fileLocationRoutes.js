const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth');
const fileLocationService = require('../../services/fileLocationService');
const { logger } = require('../../config/logger');

// Set TXT file location for current user
router.post('/location/txt', authenticate, async (req, res) => {
    try {
        const { file_path } = req.body;
        
        if (!file_path) {
            return res.status(400).json({
                success: false,
                error: 'file_path is required'
            });
        }
        
        const result = await fileLocationService.setFileLocation(
            req.user.user_id,
            'txt',
            file_path
        );
        
        res.json({
            success: true,
            message: `TXT file location ${result.action} successfully`,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Set XML file location for current user
router.post('/location/xml', authenticate, async (req, res) => {
    try {
        const { file_path } = req.body;
        
        if (!file_path) {
            return res.status(400).json({
                success: false,
                error: 'file_path is required'
            });
        }
        
        const result = await fileLocationService.setFileLocation(
            req.user.user_id,
            'xml',
            file_path
        );
        
        res.json({
            success: true,
            message: `XML file location ${result.action} successfully`,
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get both file locations for current user
router.get('/location', authenticate, async (req, res) => {
    try {
        const locations = await fileLocationService.getUserFileLocations(req.user.user_id);
        
        res.json({
            success: true,
            data: locations
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific file location
router.get('/location/:type', authenticate, async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!['txt', 'xml'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid location type. Use "txt" or "xml"'
            });
        }
        
        const location = await fileLocationService.getFileLocation(req.user.user_id, type);
        
        if (!location) {
            return res.status(404).json({
                success: false,
                error: `No ${type} file location configured`
            });
        }
        
        res.json({
            success: true,
            data: {
                location_type: type,
                ...location
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete file location
router.delete('/location/:type', authenticate, async (req, res) => {
    try {
        const { type } = req.params;
        
        if (!['txt', 'xml'].includes(type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid location type. Use "txt" or "xml"'
            });
        }
        
        const result = await fileLocationService.deleteFileLocation(req.user.user_id, type);
        
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Admin: Get location statistics
router.get('/admin/location/stats', authenticate, async (req, res) => {
    try {
        // Check if admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }
        
        const stats = await fileLocationService.getLocationStats();
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;