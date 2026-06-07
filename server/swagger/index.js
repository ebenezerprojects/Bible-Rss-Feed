const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const config = require('../config/index');

function setupSwagger(app) {
    if (!config.swagger?.enabled) {
        console.log('Swagger documentation is disabled');
        return;
    }
    
    try {
        const swaggerPath = path.join(__dirname, 'swagger.yaml');
        const swaggerDocument = YAML.load(swaggerPath);
        
        // Update server URL
        swaggerDocument.servers = [
            { url: config.server.baseUrl, description: `${config.env} server` }
        ];
        
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
            explorer: true,
            swaggerOptions: {
                persistAuthorization: true,
                displayRequestDuration: true,
                filter: true,
                tryItOutEnabled: true,
                docExpansion: 'list'
            }
        }));
        
        console.log(`✅ Swagger UI available at ${config.server.baseUrl}/api-docs`);
    } catch (error) {
        console.error(`❌ Failed to load Swagger: ${error.message}`);
    }
}

module.exports = setupSwagger;