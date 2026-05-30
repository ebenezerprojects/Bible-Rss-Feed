const YAML = require('yamljs');
const { BASE_URL, IP_ADDRESS } = require('../config/serverConfig');

function setupSwagger(app) {
    try {
        const swaggerDocument = YAML.load(process.env.SWAGGER_PATH || './swagger.yaml');

        swaggerDocument.servers = [
            { url: BASE_URL, description: `Primary Server (${IP_ADDRESS})` }
        ];

        swaggerDocument.paths = swaggerDocument.paths || {};
        swaggerDocument.paths['/rss/verse-feed'] = {
            get: {
                summary: 'Get RSS Feed',
                description: 'Returns RSS feed of Bible verses from API calls',
                responses: { '200': { description: 'RSS Feed XML' } }
            }
        };

        swaggerDocument.paths['/rss/feed.json'] = {
            get: {
                summary: 'Get RSS Feed as JSON',
                description: 'Returns RSS feed data in JSON format',
                responses: { '200': { description: 'JSON feed data' } }
            }
        };

        swaggerDocument.paths['/rss/api-history'] = {
            get: {
                summary: 'Get API Call History',
                description: 'Returns history of all API calls made',
                responses: { '200': { description: 'API call history' } }
            }
        };

        swaggerDocument.paths['/rss/ws-info'] = {
            get: {
                summary: 'Get WebSocket Info',
                description: 'Returns WebSocket connection information',
                responses: { '200': { description: 'WebSocket info' } }
            }
        };

        const swaggerUi = require('swagger-ui-express');
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

        console.log('✅ Swagger documentation enabled');
        console.log(`   📖 Swagger UI: ${BASE_URL}/api-docs`);
    } catch (error) {
        console.warn('⚠️ Swagger documentation not available:', error.message);
    }
}

module.exports = setupSwagger;