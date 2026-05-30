const { BASE_URL, IP_ADDRESS, PORT } = require('../../config/serverConfig');

function setupNetworkInfoRoute(app) {
    app.get('/network-info', (req, res) => {
        res.json({
            server: {
                port: PORT,
                ipAddress: IP_ADDRESS,
                baseUrl: BASE_URL,
                hostname: require('os').hostname()
            },
            clientInfo: {
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                userAgent: req.headers['user-agent']
            },
            availableEndpoints: {
                single_verse: `${BASE_URL}/:version/verse/:book/:chapter/:verse`,
                verse_range: `${BASE_URL}/:version/range/:book/:startChapter/:startVerse/:endChapter/:endVerse`,
                chapter: `${BASE_URL}/:version/chapter/:book/:chapter`,
                versions: `${BASE_URL}/versions`,
                books: `${BASE_URL}/:version/books`,
                search: `${BASE_URL}/:version/search/:keyword`,
                rss_feed: `${BASE_URL}/rss/verse-feed`
            },
            rssInfo: {
                description: 'Only /:version/verse/:book/:chapter/:verse endpoint updates RSS and text files',
                textFileLocation: './documents/verse.txt and ./documents/ref.txt'
            }
        });
    });
}

module.exports = setupNetworkInfoRoute;