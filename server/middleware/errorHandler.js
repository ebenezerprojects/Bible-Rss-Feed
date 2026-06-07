const { logger } = require('../config/logger');
const config = require('../config/index');

class AppError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// This is the correct catchAsync implementation
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    
    logger.error(`${err.message}`, { 
        stack: err.stack, 
        url: req.originalUrl,
        method: req.method,
        userId: req.user?.user_id
    });
    
    const response = {
        success: false,
        error: err.message || 'Internal server error',
        timestamp: new Date().toISOString()
    };
    
    if (config.isDev && err.stack) {
        response.stack = err.stack;
    }
    
    res.status(statusCode).json(response);
};

const notFoundHandler = (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
};

module.exports = { 
    AppError, 
    errorHandler, 
    notFoundHandler, 
    catchAsync 
};