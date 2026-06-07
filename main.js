#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const fs = require('fs');
const path = require('path');

const config = require('./server/config/index');
const { logger, accessLogger } = require('./server/config/logger');
const { initializeUserDatabase, closeAllDatabases, getDatabaseStats } = require('./server/config/database');
const { errorHandler, notFoundHandler } = require('./server/middleware/errorHandler');
const { generalLimiter } = require('./server/middleware/rateLimiter');

const app = express();
const server = http.createServer(app);

// Create necessary directories
const directories = [config.logging.dir, './db', './backups'];
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
    }
});

// Security and utility middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(accessLogger);
app.use(generalLimiter);

// Request ID middleware
app.use((req, res, next) => {
    req.requestId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    res.setHeader('X-Request-Id', req.requestId);
    next();
});

// Serve static frontend files
app.use('/src', express.static(path.join(__dirname, 'public/src')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// HTML route handlers
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/src', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/src', 'login.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/src', 'dashboard.html'));
});

// Handle all src routes
app.get('/src/*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', req.path));
});

// Initialize database
initializeUserDatabase();
logger.info('Database initialized');

// Database stats
const dbStats = getDatabaseStats();
logger.info('Database stats:', dbStats);

// ==================== API ROUTES ====================

// Authentication routes
app.use('/auth', require('./server/routes/auth/authRoutes'));

// Bible API routes
app.use('/api', require('./server/routes/bible/verseRoutes'));
app.use('/api', require('./server/routes/bible/bookRoutes'));
app.use('/api', require('./server/routes/bible/searchRoutes'));

// RSS feed routes
app.use('/', require('./server/routes/rss/rssRoutes'));

// Format routes
app.use('/', require('./server/routes/formats/formatRoutes'));

// Admin routes
app.use('/admin', require('./server/routes/admin/adminRoutes'));
app.use('/admin', require('./server/routes/admin/backupRoutes'));

// User management routes
app.use('/user', require('./server/routes/user/userManagementRoutes'));
app.use('/user', require('./server/routes/user/fileLocationRoutes'));

// System routes
app.use('/', require('./server/routes/system/healthRoutes'));

// Debug routes (only in development)
if (config.isDev) {
    app.use('/debug', require('./server/routes/system/debugRoutes'));
}

// API Info route
app.get('/api-info', (req, res) => {
    res.json({
        name: 'Bible API',
        version: '3.0.0',
        environment: config.env,
        documentation: config.swagger?.enabled ? `http://${config.server.host}:${config.server.port}/api-docs` : 'Disabled',
        endpoints: {
            auth: { login: 'POST /auth/login', logout: 'POST /auth/logout' },
            bible: { verse: 'GET /api/:version/verse/:book/:chapter/:verse' },
            rss: { verse_feed: 'GET /rss/:userId/:version/verse' },
            formats: { xml: 'GET /bibleshow/xml', json: 'GET /bibleshow/json' }
        }
    });
});

// Swagger documentation
// Swagger documentation
if (config.swagger?.enabled) {
    try {
        const swaggerUi = require('swagger-ui-express');
        const YAML = require('yamljs');
        const swaggerPath = path.join(__dirname, 'server', 'swagger', 'swagger.yaml');
        
        console.log('Looking for swagger at:', swaggerPath);
        
        if (fs.existsSync(swaggerPath)) {
            const swaggerDocument = YAML.load(swaggerPath);
            swaggerDocument.servers = [{ url: config.server.baseUrl, description: `${config.env} server` }];
            
            // Serve swagger UI
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
            
            // Also serve raw swagger.json
            app.get('/swagger.json', (req, res) => {
                res.json(swaggerDocument);
            });
            
            logger.info(`✅ Swagger UI available at ${config.server.baseUrl}/api-docs`);
        } else {
            logger.warn(`Swagger file not found at ${swaggerPath}`);
            console.log('Creating swagger directory and file...');
            
            // Create swagger directory if it doesn't exist
            const swaggerDir = path.join(__dirname, 'server', 'swagger');
            if (!fs.existsSync(swaggerDir)) {
                fs.mkdirSync(swaggerDir, { recursive: true });
            }
        }
    } catch (error) {
        logger.error(`Failed to load Swagger: ${error.message}`);
        console.error('Swagger error:', error);
    }
} else {
    logger.info('Swagger documentation is disabled');
    console.log('Swagger is disabled. Set SWAGGER_ENABLED=true in .env.dev');
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = () => {
    logger.info('Shutting down server...');
    server.close(async () => {
        closeAllDatabases();
        logger.info('Server shutdown complete');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('uncaughtException', (error) => { logger.error('Uncaught Exception:', error); gracefulShutdown(); });
process.on('unhandledRejection', (reason, promise) => { logger.error('Unhandled Rejection:', reason); });

// Start server
const PORT = config.server.port;
const HOST = config.server.host;
server.listen(PORT, HOST, () => {
    logger.info(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                                    BIBLE API SERVER STARTED                           ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║  Environment: ${config.env.padEnd(60)}║
║  Port: ${String(PORT).padEnd(60)}║
║  URL: http://${HOST}:${PORT}${' '.repeat(60 - String(`http://${HOST}:${PORT}`).length)}║
║  Swagger: ${(config.swagger?.enabled ? `http://${HOST}:${PORT}/api-docs` : 'Disabled').padEnd(60)}║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║  Frontend:                                                                            ║
║  - Home: http://${HOST}:${PORT}/                                                    ║
║  - Login: http://${HOST}:${PORT}/login                                              ║
║  - Dashboard: http://${HOST}:${PORT}/dashboard                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
    `);
    console.log('\n📖 Demo Accounts:');
    console.log('   Admin:  admin / admin123');
    console.log('   User:   user1 / user123');
    console.log('\n🌐 Open in browser: http://' + HOST + ':' + PORT);
});

module.exports = { app, server };