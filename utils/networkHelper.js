// const os = require('os');

// function getLocalIP() {
//     const interfaces = os.networkInterfaces();
//     for (const interfaceName in interfaces) {
//         for (const iface of interfaces[interfaceName]) {
//             if (!iface.internal && iface.family === 'IPv4') {
//                 return iface.address;
//             }
//         }
//     }
//     return 'localhost';
// }

// function getHostname() {
//     return os.hostname();
// }

// function getNetworkAddress(port = 3000) {
//     const ip = getLocalIP();
//     return `http://${ip}:${port}`;
// }

// function getFullUrl(req) {
//     return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
// }

// function getBaseUrl(req) {
//     return `${req.protocol}://${req.get('host')}`;
// }

// module.exports = {
//     getLocalIP,
//     getHostname,
//     getNetworkAddress,
//     getFullUrl,
//     getBaseUrl
// };