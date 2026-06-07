const bcrypt = require('bcrypt');
const config = require('../config/index');

async function hashPassword(password) {
    return bcrypt.hash(password, config.auth.bcryptRounds);
}

async function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, comparePassword };