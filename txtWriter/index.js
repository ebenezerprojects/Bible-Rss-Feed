const TxtGenerator = require('./txtGenerator');
const TxtMonitor = require('./txtMonitor');

class TxtWriterModule {
    constructor() {
        this.generator = null;
        this.monitor = null;
        this.isInitialized = false;
        console.log('[TxtWriter Module] Text Writer module initialized');
    }

    initialize() {
        if (this.isInitialized) {
            console.log('[TxtWriter Module] Already initialized');
            return;
        }

        console.log('[TxtWriter Module] Initializing text writer module...');

        this.generator = TxtGenerator;
        this.monitor = TxtMonitor;

        // Set up monitor event listeners
        this.monitor.on('verseUpdated', (data) => {
            console.log(`[TxtWriter Module] Verse update recorded: ${data.verse} (${data.success ? 'Success' : 'Failed'})`);
        });

        this.isInitialized = true;
        console.log('[TxtWriter Module] Text writer module initialized successfully');
    }

    // Write verse to text files
    writeVerse(verseData) {
        if (!verseData) {
            console.error('[TxtWriter Module] No verse data provided');
            return false;
        }

        const success = this.generator.writeVerseFiles(verseData);
        this.monitor.trackVerseUpdate(verseData, success);
        return success;
    }

    // Get current verse from memory
    getCurrentVerse() {
        return this.generator.getCurrentVerse();
    }

    // Get last update time
    getLastUpdate() {
        return this.generator.getLastUpdate();
    }

    // Read verse.txt file directly
    readVerseFile() {
        return this.generator.readVerseFile();
    }

    // Read ref.txt file directly
    readRefFile() {
        return this.generator.readRefFile();
    }

    // Clear all text files
    clearFiles() {
        return this.generator.clearAllFiles();
    }

    // Get update history
    getUpdateHistory(limit = 20) {
        return this.monitor.getUpdateHistory(limit);
    }

    // Get monitor stats
    getStats() {
        return this.monitor.getStats();
    }

    // Get files information
    getFilesInfo() {
        return this.generator.getFilesInfo();
    }

    // Stop module (cleanup if needed)
    stop() {
        console.log('[TxtWriter Module] Stopping text writer module...');
        this.monitor.clearHistory();
        this.isInitialized = false;
        console.log('[TxtWriter Module] Text writer module stopped');
    }
}

module.exports = new TxtWriterModule();