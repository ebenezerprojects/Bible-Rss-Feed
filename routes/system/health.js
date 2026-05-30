const { BASE_URL, IP_ADDRESS, PORT, ENV } = require('../../config/serverConfig');

function setupHealthRoute(app, rssModule) {
    app.get('/health', (req, res) => {
        const rssStatus = rssModule.rssGenerator?.getFeedAsJSON();
        const { getCurrentVerse } = require('../../utils/txtWriter');
        const textFiles = getCurrentVerse();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            server: {
                port: PORT,
                ipAddress: IP_ADDRESS,
                baseUrl: BASE_URL,
                environment: ENV
            },
            rss: {
                feedUrl: `${BASE_URL}/rss/verse-feed`,
                status: 'active',
                lastUpdate: rssStatus?.lastUpdate || null,
                latestVerse: rssStatus?.latestVerse?.reference || 'No verse yet'
            },
            textFiles: {
                verse: textFiles.verse ? `${textFiles.verse.substring(0, 100)}...` : 'No verse',
                reference: textFiles.reference || 'No reference',
                location: './documents/'
            },
            memory: process.memoryUsage(),
            version: '2.0.0'
        });
    });
}

module.exports = setupHealthRoute;