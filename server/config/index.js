const path = require('path');
const fs = require('fs');

// Load environment based on NODE_ENV
const env = process.env.NODE_ENV || 'development';

// Try multiple possible file names
const possibleEnvFiles = [
    `.env.${env}`,
    `.env.${env === 'development' ? 'dev' : env}`,
    `.env.${env === 'production' ? 'prod' : env}`,
    `.env.${env}ment`, // .env.development, .env.production
    '.env'
];

let loadedFile = null;
for (const envFile of possibleEnvFiles) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        loadedFile = envFile;
        break;
    }
}

console.log(`Environment: ${env}`);
console.log(`Loaded from: ${loadedFile || 'default'}`);
console.log(`SWAGGER_ENABLED: ${process.env.SWAGGER_ENABLED || 'not set'}`);

const config = {
    env,
    isDev: env === 'development',
    isProd: env === 'production',
    
    server: {
        port: parseInt(process.env.PORT || 3000),
        host: process.env.HOST || 'localhost',
        get baseUrl() {
            return `http://${this.host}:${this.port}`;
        }
    },
    
    database: {
        userDbPath: process.env.USER_DB_PATH || './db/user.db',
        kjvDbPath: process.env.KJV_DB_PATH || './db/kjv.db',
        tamDbPath: process.env.TAM_DB_PATH || './db/tam.db',
        sqlPath: process.env.SQL_PATH || './sql'
    },
    
    auth: {
        jwtSecret: process.env.JWT_SECRET || 'default-secret-key',
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || 10)
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        dir: process.env.LOG_DIR || './logs'
    },
    
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 900000),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100)
    },
    
    swagger: {
        enabled: process.env.SWAGGER_ENABLED === 'true'
    }
};

console.log(`Swagger enabled: ${config.swagger.enabled}`);

module.exports = config;