const EventEmitter = require('events');
const RSSGenerator = require('./rssGenerator');
const txtWriterModule = require('../txtWriter');

class VerseMonitor extends EventEmitter {
    constructor() {
        super();
        this.monitoring = false;
        this.apiCallHistory = new Map();
        console.log('[VerseMonitor] Single Verse API Monitor initialized');
    }

    trackApiResponse(apiUrl, responseData, duration) {
        try {
            const timestamp = new Date().toISOString();

            console.log(`[VerseMonitor] Single verse API captured: ${apiUrl} (${duration}ms)`);

            // Format verse data
            const verseData = RSSGenerator.formatVerseDataFromResponse(responseData, apiUrl, duration);

            if (verseData) {
                // Write to text files using txtWriter module
                txtWriterModule.writeVerse(verseData);
                console.log(`[VerseMonitor] Text files updated via txtWriter: ${verseData.reference}`);
            }

            // Emit event for new API response
            this.emit('apiResponse', {
                url: apiUrl,
                data: responseData,
                timestamp: timestamp,
                duration: duration
            });

            // Store in history
            const historyKey = `${apiUrl}-${timestamp}`;
            this.apiCallHistory.set(historyKey, {
                url: apiUrl,
                data: {
                    version: responseData.version_code,
                    reference: verseData?.reference,
                    verse_preview: verseData?.verse?.substring(0, 100) + '...'
                },
                timestamp: timestamp,
                duration: duration,
                action: 'Single Verse API Call',
                textFilesUpdated: !!verseData
            });

            // Keep only last 100 history items
            if (this.apiCallHistory.size > 100) {
                const firstKey = this.apiCallHistory.keys().next().value;
                this.apiCallHistory.delete(firstKey);
            }
        } catch (error) {
            console.error('[VerseMonitor] Error tracking API response:', error.message);
        }
    }

    getApiHistory() {
        return Array.from(this.apiCallHistory.values());
    }

    clearHistory() {
        this.apiCallHistory.clear();
        console.log('[VerseMonitor] Single verse API history cleared');
    }
}

module.exports = new VerseMonitor();