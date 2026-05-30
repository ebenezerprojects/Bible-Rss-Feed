/**
 * Server Configuration
 * Centralized configuration for the entire application
 */

const os = require('node:os');

// Get local IP address
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const interfaceName in interfaces) {
        for (const iface of interfaces[interfaceName]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const PORT = process.env.PORT || 3000;
const HOSTNAME = os.hostname();
const IP_ADDRESS = getLocalIP();
const BASE_URL = `http://${IP_ADDRESS}:${PORT}`;
const ENV = process.env.NODE_ENV || 'development';
const isDev = ENV === 'development';
const isProd = ENV === 'production';

module.exports = {
    PORT,
    HOSTNAME,
    IP_ADDRESS,
    BASE_URL,
    ENV,
    isDev,
    isProd,
    getLocalIP
};