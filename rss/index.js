const RSSGenerator = require('./rssGenerator');
const RSSWebSocketServer = require('./rssWebSocket');
const VerseMonitor = require('./verseMonitor');
const txtWriterModule = require('../txtWriter');
const { getActiveVersionsSync, refreshCache } = require('../config/versions');

class RSSModule {
    constructor() {
        this.rssGenerator = null;
        this.webSocketServer = null;
        this.verseMonitor = null;
        this.isInitialized = false;
        console.log('[RSS Module] Multi-version RSS module initialized');
    }

    initialize(server, app) {
        if (this.isInitialized) {
            console.log('[RSS Module] Already initialized');
            return;
        }

        console.log('[RSS Module] Initializing multi-version RSS module...');

        this.rssGenerator = RSSGenerator;
        this.verseMonitor = VerseMonitor;

        this.webSocketServer = new RSSWebSocketServer(server);
        this.webSocketServer.initialize();

        this.setupAPIMonitoring(app);

        this.verseMonitor.on('apiResponse', (data) => {
            console.log(`[RSS Module] Processing API response: ${data.url}`);

            const verseData = this.rssGenerator.formatVerseDataFromResponse(
                data.data,
                data.url,
                data.duration
            );

            if (verseData) {
                this.rssGenerator.addToFeed(verseData);
                txtWriterModule.writeVerse(verseData);

                if (this.webSocketServer) {
                    this.webSocketServer.broadcastNewVerses({
                        verses: [verseData],
                        source: data.url,
                        timestamp: data.timestamp,
                        duration: data.duration,
                        version: verseData.version_code
                    });
                }
            }
        });

        this.isInitialized = true;
        console.log('[RSS Module] Multi-version RSS module initialized successfully');
    }

    setupAPIMonitoring(app) {
        console.log('[RSS Module] Setting up API response monitoring...');

        let callCount = 0;
        const self = this;

        const originalJson = app.response.json;

        app.response.json = function (body) {
            const startTime = this.req._startTime || Date.now();
            const duration = Date.now() - startTime;
            const originalUrl = this.req.originalUrl;

            // Match any version from database
            const activeVersions = getActiveVersionsSync();
            const versionPattern = activeVersions.map(v => v.key).join('|');
            const isSingleVerseEndpoint = new RegExp(`\\/(${versionPattern})\\/verse\\/[A-Z]+\\/\\d+\\/\\d+`, 'i').test(originalUrl);

            if (isSingleVerseEndpoint && body) {
                callCount++;
                console.log(`[RSS Module] 📡 Single Verse API Call #${callCount}: ${originalUrl} (${duration}ms)`);

                if (self.verseMonitor) {
                    self.verseMonitor.trackApiResponse(originalUrl, body, duration);
                }
            }

            return originalJson.call(this, body);
        };

        app.use((req, res, next) => {
            req._startTime = Date.now();
            next();
        });

        console.log('[RSS Module] API monitoring enabled');
    }

    getRouter() {
        const express = require('express');
        const router = express.Router();
        const self = this;

        // Dynamic routes for each active version from database
        const activeVersions = getActiveVersionsSync();

        activeVersions.forEach(version => {
            const versionCode = version.code.toLowerCase();
            const versionName = version.name;

            // Verse RSS endpoint: /rss/{version}/verse
            router.get(`/rss/${versionCode}/verse`, (req, res) => {
                const rssData = self.rssGenerator.getVerseRSS(versionCode);
                res.header('Content-Type', 'application/rss+xml');
                res.send(rssData);
            });

            // Reference RSS endpoint: /rss/{version}/reference
            router.get(`/rss/${versionCode}/reference`, (req, res) => {
                const rssData = self.rssGenerator.getReferenceRSS(versionCode);
                res.header('Content-Type', 'application/rss+xml');
                res.send(rssData);
            });

            console.log(`[RSS Module] Registered routes for ${versionName}:`);
            console.log(`   → /rss/${versionCode}/verse`);
            console.log(`   → /rss/${versionCode}/reference`);
        });

        // List all available RSS feeds
        router.get('/rss/feeds', (req, res) => {
            const feeds = activeVersions.map(version => ({
                version: version.code,
                name: version.name,
                language: version.language_name,
                verse_feed: `${req.protocol}://${req.get('host')}/rss/${version.code.toLowerCase()}/verse`,
                reference_feed: `${req.protocol}://${req.get('host')}/rss/${version.code.toLowerCase()}/reference`
            }));

            res.json({
                total_feeds: feeds.length,
                feeds: feeds,
                note: 'Each version has two RSS feeds: verse and reference'
            });
        });

        // Refresh versions cache (admin endpoint)
        router.post('/admin/refresh-versions', (req, res) => {
            refreshCache();
            const updatedVersions = getActiveVersionsSync();
            res.json({
                success: true,
                message: 'Version cache refreshed',
                active_versions: updatedVersions.map(v => v.code)
            });
        });

        // Get all versions data as JSON
        router.get('/bibleshow/json', (req, res) => {
            const allData = self.rssGenerator.getAllVersionsData();
            res.json({
                success: true,
                versions: allData,
                last_updated: new Date().toISOString()
            });
        });

        // Standard RSS feed (default to first active version)
        router.get('/rss/standard', (req, res) => {
            const defaultVersion = activeVersions[0]?.code.toLowerCase() || 'kjv';
            const rssData = self.rssGenerator.getVerseRSS(defaultVersion);
            res.header('Content-Type', 'application/rss+xml');
            res.send(rssData);
        });

        // BibleShow XML (default to first active version)
        router.get('/bibleshow/xml', (req, res) => {
            const defaultVersion = activeVersions[0]?.code.toLowerCase() || 'kjv';
            const verseData = self.rssGenerator.getCurrentData(defaultVersion);
            if (verseData) {
                const xml = self.rssGenerator.generateBibleShowXMLForVersion(verseData);
                res.header('Content-Type', 'application/xml');
                res.send(xml);
            } else {
                res.header('Content-Type', 'application/xml');
                res.send(self.rssGenerator.generateEmptyBibleShowXML());
            }
        });

        // Formats info endpoint
        router.get('/formats', (req, res) => {
            const formats = [];

            activeVersions.forEach(version => {
                formats.push({
                    version: version.code,
                    name: version.name,
                    verse_rss: `/rss/${version.code.toLowerCase()}/verse`,
                    reference_rss: `/rss/${version.code.toLowerCase()}/reference`
                });
            });

            res.json({
                description: 'Each Bible version has two RSS feeds',
                formats: formats,
                total_feeds: formats.length * 2,
                example: activeVersions[0] ? {
                    verse: `${req.protocol}://${req.get('host')}/rss/${activeVersions[0].code.toLowerCase()}/verse`,
                    reference: `${req.protocol}://${req.get('host')}/rss/${activeVersions[0].code.toLowerCase()}/reference`
                } : null
            });
        });

        // API History endpoint
        router.get('/api-history', (req, res) => {
            if (self.verseMonitor) {
                const history = self.verseMonitor.getApiHistory();
                res.json({
                    totalCalls: history.length,
                    calls: history,
                    latestVerses: self.rssGenerator.getAllVersionsData()
                });
            } else {
                res.status(500).json({ error: 'Verse monitor not initialized' });
            }
        });

        // WebSocket info endpoint
        router.get('/ws-info', (req, res) => {
            res.json({
                websocket: {
                    url: `ws://${req.get('host')}/rss/ws`,
                    status: 'active'
                },
                feeds: {
                    list: `${req.protocol}://${req.get('host')}/rss/feeds`
                }
            });
        });

        return router;
    }

    stop() {
        console.log('[RSS Module] Stopping multi-version RSS module...');
        if (this.webSocketServer) {
            this.webSocketServer.close();
        }
        this.isInitialized = false;
        console.log('[RSS Module] Multi-version RSS module stopped');
    }
}

module.exports = new RSSModule();