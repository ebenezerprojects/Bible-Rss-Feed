#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { initializeDatabase, closeDatabase } = require('./config/database');
const { PORT, HOSTNAME, IP_ADDRESS, BASE_URL, ENV, isDev } = require('./config/serverConfig');
const routes = require('./routes');
const rssModule = require('./rss');
const txtWriterModule = require('./txtWriter');
const setupSwagger = require('./swagger/swagger');
const setupHealthRoute = require('./routes/system/health');
const setupNetworkInfoRoute = require('./routes/system/networkInfo');
const setupDebugRoute = require('./routes/system/debug');
const { getActiveVersionsSync, loadVersionsFromDB } = require('./config/versions');

const app = express();
const server = http.createServer(app);

// Create documents directory
const DOCS_DIR = path.join(__dirname, 'documents');
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log('[Main] Created documents directory');
}

// Middleware
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    const startTime = Date.now();
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const skipLogging = req.url.includes('/api-docs') || req.url.includes('/swagger');

    req._startTime = startTime;

    if (!skipLogging) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Client: ${clientIp}`);
    }

    res.on('finish', () => {
        if (!skipLogging) {
            const duration = Date.now() - startTime;
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
        }
    });

    next();
});

// Initialize
initializeDatabase();
txtWriterModule.initialize();
rssModule.initialize(server, app);

// Routes
app.use('/', routes);
app.use('/', rssModule.getRouter());
app.use('/public', express.static('public'));

// Setup system routes
setupSwagger(app);
setupHealthRoute(app, rssModule);
setupNetworkInfoRoute(app);
setupDebugRoute(app, rssModule);

// Error handling
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    res.status(500).json({ success: false, error: 'Something went wrong!', message: err.message, timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found', message: 'Please check the API documentation', documentation: `${BASE_URL}/api-docs`, timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🔴 Shutting down server...');
    txtWriterModule.stop();
    rssModule.stop();
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🔴 Shutting down server...');
    txtWriterModule.stop();
    rssModule.stop();
    closeDatabase();
    process.exit(0);
});

// Load versions and generate RSS endpoints list for display
let activeVersions = [];
let rssEndpoints = [];

async function loadAndDisplayVersions() {
    await loadVersionsFromDB();
    activeVersions = getActiveVersionsSync();
    rssEndpoints = [];
    activeVersions.forEach(version => {
        rssEndpoints.push(`   ├─ /rss/${version.code.toLowerCase()}/verse (${version.name} Verse)`);
        rssEndpoints.push(`   └─ /rss/${version.code.toLowerCase()}/reference (${version.name} Reference)`);
    });
}

// Start server
loadAndDisplayVersions().then(() => {
    server.listen(PORT, IP_ADDRESS, () => {
        console.log(`
╔════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                                                              ║
║                                         📖 BIBLE API SERVER STARTED ✅                                                       ║
║                                                                                                                              ║
║   📡 Server Information:                                                                                                    ║
║   ├─ Hostname: ${HOSTNAME}                                                                                                    ║
║   ├─ Port: ${PORT}                                                                                                            ║
║   ├─ IP Address: ${IP_ADDRESS}                                                                                                ║
║   ├─ Base URL: ${BASE_URL}                                                                                                    ║
║   └─ Environment: ${ENV}${isDev ? ' (Development)' : ' (Production)'}                                                         ║
║                                                                                                                              ║
║   📖 Bible Endpoints:                                                                                                       ║
║   ├─ Single Verse (Tracked): ${BASE_URL}/:version/verse/:book/:chapter/:verse                                                 ║
║   ├─ Verse Range:         ${BASE_URL}/:version/range/:book/:startChapter/:startVerse/:endChapter/:endVerse                   ║
║   ├─ Complete Chapter:    ${BASE_URL}/:version/chapter/:book/:chapter                                                         ║
║   ├─ Versions List:       ${BASE_URL}/versions                                                                                ║
║   ├─ Books List (OT/NT):  ${BASE_URL}/:version/books                                                                          ║
║   └─ Word Search:         ${BASE_URL}/:version/search/:keyword                                                                ║
║                                                                                                                              ║
║   📡 RSS Feeds (Per Version):                                                                                               ║
${rssEndpoints.join('\n')}
║                                                                                                                              ║
║   📄 Text Files (documents/):                                                                                               ║
║   ├─ verse.txt            - Only verse text                                                                                 ║
║   ├─ ref.txt              - Only reference                                                                                  ║
║   ├─ verse_with_ref.txt   - Reference + verse                                                                               ║
║   ├─ bible_show.xml       - BibleShow format                                                                                ║
║   └─ verse_info.json      - Structured JSON data                                                                            ║
║                                                                                                                              ║
║   🛠️ System Endpoints:                                                                                                     ║
║   ├─ Health Check:        ${BASE_URL}/health                                                                                  ║
║   ├─ Network Info:        ${BASE_URL}/network-info                                                                            ║
║   ├─ API History:         ${BASE_URL}/api-history                                                                             ║
║   ├─ RSS Feeds List:      ${BASE_URL}/rss/feeds                                                                               ║
║   ├─ Formats Info:        ${BASE_URL}/formats                                                                                 ║
║   ├─ WebSocket Info:      ${BASE_URL}/ws-info                                                                                 ║
║   └─ Debug:               ${BASE_URL}/debug ${isDev ? '(Enabled)' : '(Disabled)'}                                              ║
║                                                                                                                              ║
║   🔌 WebSocket Connection:                                                                                                  ║
║   └─ ${BASE_URL.replace('http', 'ws')}/rss/ws                                                                                 ║
║                                                                                                                              ║
║   🚀 Quick Test Commands:                                                                                                   ║
║   ┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   ║
║   │ 1. Update verse for ${activeVersions[0]?.code || 'KJV'} (triggers all formats):                                          │   ║
║   │    curl ${BASE_URL}/${activeVersions[0]?.key || 'kjv'}/verse/JHN/3/16                                                    │   ║
║   │                                                                                                                         │   ║
║   │ 2. Get ${activeVersions[0]?.code || 'KJV'} Verse RSS:                                                                    │   ║
║   │    curl ${BASE_URL}/rss/${activeVersions[0]?.key || 'kjv'}/verse                                                         │   ║
║   │                                                                                                                         │   ║
║   │ 3. Get ${activeVersions[0]?.code || 'KJV'} Reference RSS:                                                                │   ║
║   │    curl ${BASE_URL}/rss/${activeVersions[0]?.key || 'kjv'}/reference                                                     │   ║
║   │                                                                                                                         │   ║
║   │ 4. List all available RSS feeds:                                                                                       │   ║
║   │    curl ${BASE_URL}/rss/feeds                                                                                           │   ║
║   └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘   ║
║                                                                                                                              ║
║   📖 Swagger Documentation: ${BASE_URL}/api-docs                                                                             ║
║                                                                                                                              ║
╚════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════╝
        `);
    });
});

module.exports = { app, server };