const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const config = require('./index');

if (!fs.existsSync(config.logging.dir)) {
    fs.mkdirSync(config.logging.dir, { recursive: true });
}

const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => {
        return `${timestamp} [${level.toUpperCase()}] ${message}`;
    })
);

const logger = winston.createLogger({
    level: config.logging.level,
    format: logFormat,
    transports: [
        new DailyRotateFile({
            filename: path.join(config.logging.dir, `app-${config.env}.log`),
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        }),
        new DailyRotateFile({
            filename: path.join(config.logging.dir, `error-${config.env}.log`),
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '30d'
        })
    ]
});

if (config.isDev) {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), logFormat)
    }));
}

const accessLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
};

module.exports = { logger, accessLogger };