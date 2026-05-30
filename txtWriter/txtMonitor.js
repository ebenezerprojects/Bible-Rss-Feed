const EventEmitter = require('events');

class TxtMonitor extends EventEmitter {
    constructor() {
        super();
        this.trackedCount = 0;
        this.updateHistory = [];
        console.log('[TxtMonitor] Text file monitor initialized');
    }

    trackVerseUpdate(verseData, success) {
        const timestamp = new Date().toISOString();
        this.trackedCount++;

        const updateRecord = {
            id: this.trackedCount,
            verse: verseData.reference,
            version: verseData.version_code,
            timestamp: timestamp,
            success: success,
            book: verseData.book_name,
            chapter: verseData.chapter_num,
            verseNum: verseData.verse_num
        };

        this.updateHistory.unshift(updateRecord);

        // Keep only last 100 records
        if (this.updateHistory.length > 100) {
            this.updateHistory.pop();
        }

        this.emit('verseUpdated', updateRecord);

        console.log(`[TxtMonitor] Verse update #${this.trackedCount}: ${verseData.reference} - ${success ? 'Success' : 'Failed'}`);
    }

    getUpdateHistory(limit = 20) {
        return this.updateHistory.slice(0, limit);
    }

    getStats() {
        return {
            totalUpdates: this.trackedCount,
            lastUpdate: this.updateHistory[0] || null,
            recentUpdates: this.updateHistory.slice(0, 5)
        };
    }

    clearHistory() {
        this.updateHistory = [];
        console.log('[TxtMonitor] Update history cleared');
    }
}

module.exports = new TxtMonitor();