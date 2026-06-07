const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many requests. Please try again later.' },
    keyGenerator: (req) => req.user?.user_id || req.ip
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, error: 'Too many login attempts. Please try again after 15 minutes.' }
});

module.exports = { generalLimiter, authLimiter };