PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
    user_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    last_login TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bible_version (
    version_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    version_code TEXT NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    db_path TEXT NOT NULL,
    language_code TEXT NOT NULL,
    language_name TEXT NOT NULL,
    copyright TEXT NOT NULL,
    book_table TEXT NOT NULL,
    book_pk TEXT NOT NULL,
    verse_table TEXT NOT NULL,
    verse_fk TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS user_bible_mapping (
    mapping_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fk INTEGER NOT NULL,
    version_fk INTEGER NOT NULL,
    is_default BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
    FOREIGN KEY (version_fk) REFERENCES bible_version(version_pk) ON DELETE CASCADE,
    UNIQUE(user_fk, version_fk)
);

CREATE TABLE IF NOT EXISTS api_request_history (
    request_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fk INTEGER NOT NULL,
    version_fk INTEGER NOT NULL,
    request_url TEXT NOT NULL,
    endpoint_type TEXT NOT NULL,
    version_code TEXT NOT NULL,
    book_short_name TEXT,
    chapter_num INTEGER,
    verse_num INTEGER,
    request_key TEXT,
    response_time_ms INTEGER,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
    FOREIGN KEY (version_fk) REFERENCES bible_version(version_pk) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rss_feed_history (
    rss_history_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fk INTEGER NOT NULL,
    version_fk INTEGER NOT NULL,
    reference TEXT NOT NULL,
    verse TEXT NOT NULL,
    verse_preview TEXT,
    book_name TEXT NOT NULL,
    book_short_name TEXT NOT NULL,
    chapter_num INTEGER NOT NULL,
    verse_num INTEGER NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_latest BOOLEAN DEFAULT 0,
    FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
    FOREIGN KEY (version_fk) REFERENCES bible_version(version_pk) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS search_history (
    search_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fk INTEGER NOT NULL,
    version_fk INTEGER NOT NULL,
    keyword TEXT NOT NULL,
    testament_filter TEXT,
    book_filter TEXT,
    limit_count INTEGER DEFAULT 50,
    result_count INTEGER,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
    FOREIGN KEY (version_fk) REFERENCES bible_version(version_pk) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS available_formats (
    format_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    format_code TEXT NOT NULL UNIQUE,
    format_name TEXT NOT NULL,
    format_type TEXT NOT NULL,
    endpoint_url_pattern TEXT,
    content_type TEXT,
    is_active BOOLEAN DEFAULT 1,
    display_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_format_permissions (
    permission_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fk INTEGER NOT NULL,
    format_fk INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    granted_by TEXT,
    granted_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE,
    FOREIGN KEY (format_fk) REFERENCES available_formats(format_pk) ON DELETE CASCADE,
    UNIQUE(user_fk, format_fk)
);

CREATE TABLE IF NOT EXISTS user_session (
    session_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    user_fk INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT 1,
    expires_at TIMESTAMP,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_fk) REFERENCES user(user_pk) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_user_id ON user(user_id);
CREATE INDEX IF NOT EXISTS idx_api_req_user ON api_request_history(user_fk, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_rss_history_user ON rss_feed_history(user_fk, version_fk, accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_token ON user_session(token);

CREATE TRIGGER IF NOT EXISTS update_latest_verse 
AFTER INSERT ON rss_feed_history
BEGIN
    UPDATE rss_feed_history SET is_latest = 0 
    WHERE user_fk = NEW.user_fk AND version_fk = NEW.version_fk AND is_latest = 1;
    UPDATE rss_feed_history SET is_latest = 1 WHERE rss_history_pk = NEW.rss_history_pk;
END;