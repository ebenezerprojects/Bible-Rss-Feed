const WebSocket = require('ws');

class RSSWebSocketServer {
    constructor(server) {
        this.wss = null;
        this.server = server;
        this.clients = new Set();
        console.log('[RSSWebSocket] WebSocket server initialized');
    }

    initialize() {
        this.wss = new WebSocket.Server({
            server: this.server,
            path: '/rss/ws'
        });

        console.log('[RSSWebSocket] WebSocket server listening on /rss/ws');

        this.wss.on('connection', (ws, req) => {
            const clientId = this.generateClientId(req);
            console.log(`[RSSWebSocket] Client connected: ${clientId}`);

            this.clients.add(ws);

            ws.send(JSON.stringify({
                type: 'welcome',
                message: 'Connected to Bible API Monitor',
                clientId: clientId,
                timestamp: new Date().toISOString(),
                monitoring: {
                    type: 'Real-time API Response Monitor',
                    endpoints: ['verse', 'chapter', 'book', 'compare', 'multi-verse', 'random'],
                    trigger: 'Any Bible API call will generate an update'
                }
            }));

            ws.on('message', (data) => {
                this.handleMessage(ws, data);
            });

            ws.on('close', () => {
                this.clients.delete(ws);
                console.log(`[RSSWebSocket] Client disconnected: ${clientId}`);
            });

            ws.on('error', (error) => {
                console.error(`[RSSWebSocket] Error for client ${clientId}:`, error.message);
            });
        });
    }

    generateClientId(req) {
        const ip = req.socket.remoteAddress;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return `${ip}-${timestamp}-${random}`;
    }

    handleMessage(ws, data) {
        try {
            const message = JSON.parse(data.toString());
            console.log('[RSSWebSocket] Message received:', message.type);

            switch (message.type) {
                case 'subscribe':
                    ws.send(JSON.stringify({
                        type: 'subscribed',
                        message: 'You will now receive API response updates',
                        timestamp: new Date().toISOString()
                    }));
                    break;
                case 'getHistory':
                    const { getApiHistory } = require('./verseMonitor');
                    ws.send(JSON.stringify({
                        type: 'history',
                        data: getApiHistory(),
                        timestamp: new Date().toISOString()
                    }));
                    break;
                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                    break;
                default:
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: `Unknown message type: ${message.type}`,
                        timestamp: new Date().toISOString()
                    }));
            }
        } catch (error) {
            console.error('[RSSWebSocket] Error parsing message:', error.message);
        }
    }

    broadcastNewVerses(data) {
        const message = JSON.stringify({
            type: 'apiResponse',
            data: data,
            timestamp: new Date().toISOString()
        });

        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });

        console.log(`[RSSWebSocket] Broadcasted to ${this.clients.size} clients`);
    }

    getClientCount() {
        return this.wss ? this.wss.clients.size : 0;
    }

    close() {
        if (this.wss) {
            this.wss.close();
            console.log('[RSSWebSocket] WebSocket server closed');
        }
    }
}

module.exports = RSSWebSocketServer;