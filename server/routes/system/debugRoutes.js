const express = require('express');
const router = express.Router();
const config = require('../../config/index');
const { getDatabaseStats } = require('../../config/database');
const os = require('os');

router.get('/debug', (req, res) => {
    res.json({
        environment: config.env,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        databases: getDatabaseStats(),
        system: {
            platform: os.platform(),
            cpus: os.cpus().length,
            totalMemory: os.totalmem(),
            freeMemory: os.freemem()
        }
    });
});

router.get('/debug/db', (req, res) => {
    const db = require('../../config/database').getUserDatabase();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    res.json({ tables });
});

module.exports = router;