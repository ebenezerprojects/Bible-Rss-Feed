const RSS = require('rss');
const { BASE_URL } = require('../config/serverConfig');
const { getActiveVersionsSync } = require('../config/versions');

class RSSGenerator {
    constructor() {
        this.currentData = new Map();
        this.lastUpdate = new Map();
        console.log('[RSSGenerator] Multi-version RSS generator initialized');
    }

    formatVerseDataFromResponse(response, url, duration) {
        try {
            let verseData = null;

            if (response.verse && (response.book_short_name || response.book_name)) {
                const versionCode = response.version_code || this.extractVersionFromUrl(url);
                const activeVersions = getActiveVersionsSync();
                const versionInfo = activeVersions.find(v => v.code === versionCode);

                verseData = {
                    version_code: versionCode,
                    version_name: versionInfo?.name || versionCode,
                    version_language: versionInfo?.language_name || 'English',
                    version_copyright: versionInfo?.copyright || 'Public Domain',
                    book_short_name: response.book_short_name || response.book_name,
                    book_name: response.book_name || response.book_short_name,
                    chapter_num: response.chapter_num,
                    verse_num: response.verse_num,
                    verse: response.verse,
                    reference: `${response.book_name || response.book_short_name} ${response.chapter_num}:${response.verse_num}`,
                    timestamp: new Date().toISOString(),
                    responseTime: duration,
                    timeCode: Date.now().toString()
                };
            }

            return verseData;
        } catch (error) {
            console.error('[RSSGenerator] Error formatting verse data:', error.message);
            return null;
        }
    }

    extractVersionFromUrl(url) {
        const activeVersions = getActiveVersionsSync();
        const versionPattern = activeVersions.map(v => v.key).join('|');
        const match = url.match(new RegExp(`\\/(${versionPattern})\\/verse\\/`, 'i'));
        return match ? match[1].toUpperCase() : 'BIBLE';
    }

    addToFeed(verseData) {
        if (!verseData) return;
        const version = verseData.version_code.toLowerCase();
        console.log(`[RSSGenerator] New verse data for ${version}: ${verseData.reference}`);

        this.currentData.set(version, { ...verseData, addedAt: new Date().toISOString() });
        this.lastUpdate.set(version, new Date());

        this.generateVersionRSS(version);
    }

    generateVersionRSS(version) {
        const verseData = this.currentData.get(version);
        if (!verseData) return null;

        const activeVersions = getActiveVersionsSync();
        const versionConfig = activeVersions.find(v => v.code === version.toUpperCase());
        const versionLower = version.toLowerCase();

        const feed = new RSS({
            title: `${versionConfig?.name || version.toUpperCase()} - Bible Verse`,
            description: `Latest Bible verse from ${versionConfig?.name || version.toUpperCase()}`,
            feed_url: `${BASE_URL}/rss/${versionLower}/verse`,
            site_url: `${BASE_URL}`,
            language: versionConfig?.language_code || 'en',
            copyright: versionConfig?.copyright || `Bible API ${new Date().getFullYear()}`,
            pubDate: new Date(verseData.timestamp).toUTCString(),
            ttl: 5,
            generator: 'Bible API RSS Generator'
        });

        feed.item({
            title: `${verseData.verse} ${verseData.reference}`,
            description: verseData.verse,
            url: `${BASE_URL}/api/verse/${versionLower}/${verseData.book_short_name}/${verseData.chapter_num}/${verseData.verse_num}`,
            guid: `verse-${version}-${Date.now()}`,
            categories: ['Bible', 'Verse', version.toUpperCase()],
            date: new Date(verseData.timestamp).toUTCString(),
            author: 'Bible API'
        });

        const rssData = feed.xml({ indent: true });

        this[`rssData_${version}`] = rssData;
        console.log(`[RSSGenerator] RSS generated for ${version}: ${verseData.reference}`);

        return rssData;
    }

    getVerseRSS(version) {
        const versionLower = version.toLowerCase();
        const rssData = this[`rssData_${versionLower}`];
        if (rssData) return rssData;

        return this.generateEmptyVerseRSS(version);
    }

    getReferenceRSS(version) {
        const versionLower = version.toLowerCase();
        const verseData = this.currentData.get(versionLower);

        if (!verseData) {
            return this.generateEmptyReferenceRSS(version);
        }

        const activeVersions = getActiveVersionsSync();
        const versionConfig = activeVersions.find(v => v.code === version.toUpperCase());

        const feed = new RSS({
            title: `${versionConfig?.name || version.toUpperCase()} - Bible Reference`,
            description: `Latest Bible reference from ${versionConfig?.name || version.toUpperCase()}`,
            feed_url: `${BASE_URL}/rss/${versionLower}/reference`,
            site_url: `${BASE_URL}`,
            language: versionConfig?.language_code || 'en',
            copyright: versionConfig?.copyright || `Bible API ${new Date().getFullYear()}`,
            pubDate: new Date(verseData.timestamp).toUTCString(),
            ttl: 5,
            generator: 'Bible API RSS Generator'
        });

        feed.item({
            title: verseData.reference,
            description: `${verseData.reference} - ${verseData.version_name}`,
            url: `${BASE_URL}/api/verse/${versionLower}/${verseData.book_short_name}/${verseData.chapter_num}/${verseData.verse_num}`,
            guid: `reference-${version}-${Date.now()}`,
            categories: ['Bible', 'Reference', version.toUpperCase()],
            date: new Date(verseData.timestamp).toUTCString()
        });

        return feed.xml({ indent: true });
    }

    generateEmptyVerseRSS(version) {
        const activeVersions = getActiveVersionsSync();
        const versionConfig = activeVersions.find(v => v.code === version.toUpperCase());
        const versionLower = version.toLowerCase();

        const feed = new RSS({
            title: `${versionConfig?.name || version.toUpperCase()} - Bible Verse`,
            description: 'No verse accessed yet',
            feed_url: `${BASE_URL}/rss/${versionLower}/verse`,
            site_url: BASE_URL,
            language: versionConfig?.language_code || 'en',
            ttl: 5
        });
        feed.item({
            title: 'No verse yet',
            description: `Make an API call to /${versionLower}/verse/:book/:chapter/:verse to see the verse here`,
            url: BASE_URL,
            guid: 'empty'
        });
        return feed.xml({ indent: true });
    }

    generateEmptyReferenceRSS(version) {
        const activeVersions = getActiveVersionsSync();
        const versionConfig = activeVersions.find(v => v.code === version.toUpperCase());
        const versionLower = version.toLowerCase();

        const feed = new RSS({
            title: `${versionConfig?.name || version.toUpperCase()} - Bible Reference`,
            description: 'No reference accessed yet',
            feed_url: `${BASE_URL}/rss/${versionLower}/reference`,
            site_url: BASE_URL,
            language: versionConfig?.language_code || 'en',
            ttl: 5
        });
        feed.item({
            title: 'No reference yet',
            description: `Make an API call to /${versionLower}/verse/:book/:chapter/:verse to see the reference here`,
            url: BASE_URL,
            guid: 'empty'
        });
        return feed.xml({ indent: true });
    }

    getCurrentData(version) {
        return this.currentData.get(version?.toLowerCase());
    }

    getAllVersionsData() {
        const result = {};
        for (const [version, data] of this.currentData) {
            result[version] = data;
        }
        return result;
    }

    generateBibleShowXMLForVersion(verseData) {
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
    <TimeCode>${verseData.timeCode || Date.now()}</TimeCode>
    <Reference>${escapeXml(verseData.reference)} (${verseData.version_code})</Reference>
    <Scripture>${escapeXml(verseData.verse)}</Scripture>
    <ImagePath></ImagePath>
    <BibleVersion>${escapeXml(verseData.version_code)}</BibleVersion>
    <BibleCopyright>${escapeXml(verseData.version_copyright)}</BibleCopyright>
    <BibleLanguage>${escapeXml(verseData.version_language)}</BibleLanguage>
    <BookName>${escapeXml(verseData.book_name)}</BookName>
    <BookTitle>${escapeXml(verseData.book_name)}</BookTitle>
    <BookAbbreviation>${escapeXml(verseData.book_short_name)}.</BookAbbreviation>
    <ChapterNumber>${verseData.chapter_num}</ChapterNumber>
    <VerseNumber>${verseData.verse_num}</VerseNumber>
    <BackgroundPath>BibleOpened07.jpg</BackgroundPath>
</BibleShowData>`;
    }

    generateEmptyBibleShowXML() {
        return `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<BibleShowData>
    <TimeCode>${Date.now()}</TimeCode>
    <Reference>No verse accessed yet</Reference>
    <Scripture>Make an API call to /:version/verse/:book/:chapter/:verse to see the verse here</Scripture>
    <ImagePath></ImagePath>
    <BibleVersion></BibleVersion>
    <BibleCopyright></BibleCopyright>
    <BibleLanguage></BibleLanguage>
    <BookName></BookName>
    <BookTitle></BookTitle>
    <BookAbbreviation></BookAbbreviation>
    <ChapterNumber>0</ChapterNumber>
    <VerseNumber>0</VerseNumber>
    <BackgroundPath>BibleOpened07.jpg</BackgroundPath>
</BibleShowData>`;
    }
}

module.exports = new RSSGenerator();