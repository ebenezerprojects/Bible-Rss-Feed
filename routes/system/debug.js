const { BASE_URL, IP_ADDRESS, PORT, ENV, isDev } = require('../../config/serverConfig');

function setupDebugRoute(app, rssModule) {
    if (isDev) {
        // Debug endpoint - detailed server information
        app.get('/debug', (req, res) => {
            const { getCurrentVerse } = require('../../utils/txtWriter');
            const textFiles = getCurrentVerse();

            res.json({
                environment: {
                    NODE_ENV: ENV,
                    PORT: PORT,
                    IP_ADDRESS: IP_ADDRESS,
                    BASE_URL: BASE_URL
                },
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                versions: require('../../config/versions').getAllVersions(),
                server: {
                    ipAddress: IP_ADDRESS,
                    port: PORT,
                    baseUrl: BASE_URL
                },
                rssStatus: {
                    feedAvailable: !!rssModule.rssGenerator?.getCurrentFeed(),
                    wsClients: rssModule.webSocketServer?.getClientCount() || 0,
                    totalApiCalls: rssModule.verseMonitor?.getApiHistory().length || 0,
                    latestVerse: rssModule.rssGenerator?.getFeedAsJSON()?.latestVerse?.reference || 'None'
                },
                textFiles: {
                    verse: textFiles.verse || 'No verse (make a single verse API call)',
                    reference: textFiles.reference || 'No reference',
                    location: './documents/'
                },
                recentApiCalls: rssModule.verseMonitor?.getApiHistory()?.slice(-5) || []
            });
        });

        // Debug endpoint - test RSS update
        app.post('/debug/test-rss', (req, res) => {
            const testVerse = {
                version_code: 'KJV',
                book_short_name: 'TEST',
                book_name: 'Test Book',
                chapter_num: 1,
                verse_num: 1,
                verse: 'This is a test verse for debugging.',
                reference: 'TEST 1:1',
                timestamp: new Date().toISOString(),
                source: 'debug_api',
                responseTime: 0
            };

            rssModule.rssGenerator.addToFeed(testVerse);
            const { writeVerseToFile } = require('../../utils/txtWriter');
            writeVerseToFile(testVerse);

            res.json({
                success: true,
                message: 'Test verse added to RSS and text files',
                verse: testVerse
            });
        });

        // Debug endpoint - system info
        app.get('/debug/system', (req, res) => {
            const os = require('os');
            res.json({
                system: {
                    platform: os.platform(),
                    arch: os.arch(),
                    cpus: os.cpus().length,
                    totalMemory: os.totalmem(),
                    freeMemory: os.freemem(),
                    hostname: os.hostname(),
                    uptime: os.uptime()
                },
                process: {
                    pid: process.pid,
                    title: process.title,
                    nodeVersion: process.version,
                    execPath: process.execPath
                }
            });
        });

        console.log('✅ Debug endpoints enabled (development only)');
        console.log(`   🔧 Debug UI: ${BASE_URL}/debug`);
        console.log(`   🔧 System Info: ${BASE_URL}/debug/system`);
        console.log(`   🔧 Test RSS: POST ${BASE_URL}/debug/test-rss`);
    } else {
        // In production, debug endpoint returns 404
        app.get('/debug', (req, res) => {
            res.status(404).json({ error: 'Debug endpoints not available in production' });
        });
    }
}

module.exports = setupDebugRoute;