-- ============================================
-- CREATE TABLES SCRIPT
-- Bible Database - SQLite 3
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- 4. BIBLE VERSION TABLE (Metadata)
-- ============================================
CREATE TABLE bible_version (
    version_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    db_name TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    language_code TEXT NOT NULL,
    language_name TEXT NOT NULL,
    copyright TEXT NOT NULL,
    book_table TEXT NOT NULL,
    book_pk TEXT NOT NULL,
    verse_table TEXT NOT NULL,
    verse_fk TEXT NOT NULL, 
    is_active BOOLEAN DEFAULT 1,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);