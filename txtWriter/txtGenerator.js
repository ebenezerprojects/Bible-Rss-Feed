const fs = require('fs');
const path = require('path');

class TxtGenerator {
    constructor() {
        this.documentsDir = path.join(__dirname, '../documents');
        this.currentVerse = null;
        this.lastUpdate = null;
        this.ensureDocumentsDirectory();
        console.log('[TxtGenerator] Text file generator initialized');
    }

    ensureDocumentsDirectory() {
        if (!fs.existsSync(this.documentsDir)) {
            fs.mkdirSync(this.documentsDir, { recursive: true });
            console.log('[TxtGenerator] Created documents directory');
        }
    }

    formatVerseData(verseData) {
        return {
            version_code: verseData.version_code,
            book_short_name: verseData.book_short_name,
            book_name: verseData.book_name,
            chapter_num: verseData.chapter_num,
            verse_num: verseData.verse_num,
            verse: verseData.verse,
            reference: verseData.reference,
            timestamp: verseData.timestamp || new Date().toISOString()
        };
    }

    writeVerseFiles(verseData) {
        try {
            const formattedData = this.formatVerseData(verseData);

            // Write verse.txt (only the verse text)
            const versePath = path.join(this.documentsDir, 'verse.txt');
            fs.writeFileSync(versePath, formattedData.verse, 'utf8');
            console.log(`[TxtGenerator] ✅ Updated verse.txt: ${formattedData.reference}`);

            // Write ref.txt (only the reference)
            const refPath = path.join(this.documentsDir, 'ref.txt');
            fs.writeFileSync(refPath, formattedData.reference, 'utf8');
            console.log(`[TxtGenerator] ✅ Updated ref.txt: ${formattedData.reference}`);

            // Write verse_with_ref.txt (reference + verse)
            const combinedPath = path.join(this.documentsDir, 'verse_with_ref.txt');
            fs.writeFileSync(combinedPath, `${formattedData.reference}\n\n${formattedData.verse}`, 'utf8');
            console.log(`[TxtGenerator] ✅ Updated verse_with_ref.txt: ${formattedData.reference}`);

            // Write bible_show.xml (BibleShow format)
            const bibleShowPath = path.join(this.documentsDir, 'bible_show.xml');
            const bibleShowXml = this.generateBibleShowXML(formattedData);
            fs.writeFileSync(bibleShowPath, bibleShowXml, 'utf8');
            console.log(`[TxtGenerator] ✅ Updated bible_show.xml: ${formattedData.reference}`);

            // Write verse_info.json (structured data)
            const jsonPath = path.join(this.documentsDir, 'verse_info.json');
            fs.writeFileSync(jsonPath, JSON.stringify(formattedData, null, 2), 'utf8');
            console.log(`[TxtGenerator] ✅ Updated verse_info.json: ${formattedData.reference}`);

            this.currentVerse = formattedData;
            this.lastUpdate = new Date();

            return true;
        } catch (error) {
            console.error('[TxtGenerator] Error writing text files:', error.message);
            return false;
        }
    }

    generateBibleShowXML(verseData) {
        const escapeXml = (unsafe) => {
            if (!unsafe) return '';
            return unsafe.replace(/[<>&'"]/g, (c) => {
                switch (c) {
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '&': return '&amp;';
                    case '\'': return '&apos;';
                    case '"': return '&quot;';
                    default: return c;
                }
            });
        };

        return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<BibleShowData>
    <TimeCode>${Date.now()}</TimeCode>
    <Reference>${escapeXml(verseData.reference)} (${verseData.version_code})</Reference>
    <Scripture>${escapeXml(verseData.verse)}</Scripture>
    <ImagePath></ImagePath>
    <BibleVersion>${escapeXml(verseData.version_code)}</BibleVersion>
    <BibleCopyright>Public Domain</BibleCopyright>
    <BibleLanguage>English</BibleLanguage>
    <BookName>${escapeXml(verseData.book_name)}</BookName>
    <BookTitle>${escapeXml(verseData.book_name)}</BookTitle>
    <BookAbbreviation>${escapeXml(verseData.book_short_name)}.</BookAbbreviation>
    <ChapterNumber>${verseData.chapter_num}</ChapterNumber>
    <VerseNumber>${verseData.verse_num}</VerseNumber>
    <BackgroundPath>BibleOpened07.jpg</BackgroundPath>
</BibleShowData>`;
    }

    getCurrentVerse() {
        return this.currentVerse;
    }

    getLastUpdate() {
        return this.lastUpdate;
    }

    readVerseFile() {
        try {
            const versePath = path.join(this.documentsDir, 'verse.txt');
            if (fs.existsSync(versePath)) {
                return fs.readFileSync(versePath, 'utf8');
            }
            return '';
        } catch (error) {
            console.error('[TxtGenerator] Error reading verse.txt:', error.message);
            return '';
        }
    }

    readRefFile() {
        try {
            const refPath = path.join(this.documentsDir, 'ref.txt');
            if (fs.existsSync(refPath)) {
                return fs.readFileSync(refPath, 'utf8');
            }
            return '';
        } catch (error) {
            console.error('[TxtGenerator] Error reading ref.txt:', error.message);
            return '';
        }
    }

    clearAllFiles() {
        try {
            const files = ['verse.txt', 'ref.txt', 'verse_with_ref.txt', 'bible_show.xml', 'verse_info.json'];
            files.forEach(file => {
                const filePath = path.join(this.documentsDir, file);
                if (fs.existsSync(filePath)) {
                    fs.writeFileSync(filePath, '', 'utf8');
                }
            });
            this.currentVerse = null;
            this.lastUpdate = null;
            console.log('[TxtGenerator] All text files cleared');
            return true;
        } catch (error) {
            console.error('[TxtGenerator] Error clearing files:', error.message);
            return false;
        }
    }

    getFilesInfo() {
        const files = ['verse.txt', 'ref.txt', 'verse_with_ref.txt', 'bible_show.xml', 'verse_info.json'];
        const fileInfo = {};

        files.forEach(file => {
            const filePath = path.join(this.documentsDir, file);
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                fileInfo[file] = {
                    exists: true,
                    size: stats.size,
                    modified: stats.mtime
                };
            } else {
                fileInfo[file] = { exists: false };
            }
        });

        return fileInfo;
    }
}

module.exports = new TxtGenerator();