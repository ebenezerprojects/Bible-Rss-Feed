const express = require('express');
const router = express.Router();
const { getDatabaseStats } = require('../../config/database');
const config = require('../../config/index');

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.env,
        version: '3.0.0'
    });
});

router.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/health/ready', (req, res) => {
    res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});

module.exports = router;