const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../documents');

// Ensure documents directory exists
if (!fs.existsSync(DOCS_DIR)) {
    fs.mkdirSync(DOCS_DIR, { recursive: true });
    console.log('[TxtWriter] Created documents directory');
}

// Store the last written verse to avoid duplicate writes
let lastWrittenVerse = null;

function writeVerseToFile(verseData) {
    try {
        // Check if this is the same verse as last time (avoid duplicate writes)
        const verseKey = `${verseData.version_code}-${verseData.book_short_name}-${verseData.chapter_num}-${verseData.verse_num}`;

        if (lastWrittenVerse === verseKey) {
            console.log(`[TxtWriter] Skipping duplicate verse: ${verseData.reference}`);
            return;
        }

        lastWrittenVerse = verseKey;

        // Write verse.txt (only the verse text)
        const versePath = path.join(DOCS_DIR, 'verse.txt');
        fs.writeFileSync(versePath, verseData.verse, 'utf8');
        console.log(`[TxtWriter] ✅ Updated verse.txt: ${verseData.reference}`);

        // Write ref.txt (only the reference)
        const refPath = path.join(DOCS_DIR, 'ref.txt');
        fs.writeFileSync(refPath, verseData.reference, 'utf8');
        console.log(`[TxtWriter] ✅ Updated ref.txt: ${verseData.reference}`);

        // Optional: Write combined file
        const combinedPath = path.join(DOCS_DIR, 'verse_with_ref.txt');
        fs.writeFileSync(combinedPath, `${verseData.reference}\n\n${verseData.verse}`, 'utf8');
        console.log(`[TxtWriter] ✅ Updated verse_with_ref.txt: ${verseData.reference}`);

    } catch (error) {
        console.error('[TxtWriter] Error writing text files:', error.message);
    }
}

// Function to get current verse from files
function getCurrentVerse() {
    try {
        const versePath = path.join(DOCS_DIR, 'verse.txt');
        const refPath = path.join(DOCS_DIR, 'ref.txt');

        const verse = fs.existsSync(versePath) ? fs.readFileSync(versePath, 'utf8') : '';
        const reference = fs.existsSync(refPath) ? fs.readFileSync(refPath, 'utf8') : '';

        return { verse, reference };
    } catch (error) {
        console.error('[TxtWriter] Error reading files:', error.message);
        return { verse: '', reference: '' };
    }
}

// Function to clear text files
function clearTextFiles() {
    try {
        const versePath = path.join(DOCS_DIR, 'verse.txt');
        const refPath = path.join(DOCS_DIR, 'ref.txt');
        const combinedPath = path.join(DOCS_DIR, 'verse_with_ref.txt');

        fs.writeFileSync(versePath, '', 'utf8');
        fs.writeFileSync(refPath, '', 'utf8');
        fs.writeFileSync(combinedPath, '', 'utf8');

        lastWrittenVerse = null;
        console.log('[TxtWriter] All text files cleared');
    } catch (error) {
        console.error('[TxtWriter] Error clearing files:', error.message);
    }
}

module.exports = {
    writeVerseToFile,
    getCurrentVerse,
    clearTextFiles
};