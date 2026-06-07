const os = require('os');
const config = require('./index');

function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name in interfaces) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

module.exports = {
    port: config.server.port,
    host: config.server.host,
    ipAddress: getLocalIP(),
    baseUrl: config.server.baseUrl,
    env: config.env,
    isDev: config.isDev,
    isProd: config.isProd,
    cors: {
        origin: config.isProd ? [] : '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
    }
};