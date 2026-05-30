-- ============================================
-- CREATE TABLES SCRIPT
-- Bible Database - SQLite 3
-- ============================================

PRAGMA foreign_keys = ON;

-- ============================================
-- 1. TESTAMENT TABLE
-- ============================================
CREATE TABLE testament (
    testament_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    testament_name TEXT NOT NULL UNIQUE
);

-- ============================================
-- 2. CATEGORY TABLE
-- ============================================
CREATE TABLE category (
    category_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    category_name TEXT NOT NULL UNIQUE
);

-- ============================================
-- 3. BOOK_DETAILS TABLE
-- ============================================
CREATE TABLE book_details (
    book_details_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    testament_fk INTEGER NOT NULL,
    category_fk INTEGER NOT NULL,
    book_global_id TEXT NOT NULL UNIQUE,
    book_number INTEGER NOT NULL UNIQUE,
    chapter_count INTEGER,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (testament_fk) REFERENCES testament(testament_pk) ON DELETE CASCADE,
    FOREIGN KEY (category_fk) REFERENCES category(category_pk) ON DELETE CASCADE
);

-- ============================================
-- 4. BIBLE VERSION TABLE (Metadata)
-- ============================================
CREATE TABLE bible_version (
    version_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
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

-- ============================================
-- 5. KJV TABLES
-- ============================================
CREATE TABLE kjv_book_name (
    kjv_book_name_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    book_details_fk INTEGER NOT NULL,
    book_name TEXT NOT NULL UNIQUE,
    book_short_name TEXT,
    FOREIGN KEY (book_details_fk) REFERENCES book_details(book_details_pk) ON DELETE CASCADE
);

CREATE TABLE kjv_verses (
    kjv_verse_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    kjv_book_name_fk INTEGER NOT NULL,
    chapter_num INTEGER NOT NULL,
    verse_num INTEGER NOT NULL,
    verse TEXT NOT NULL,
    FOREIGN KEY (kjv_book_name_fk) REFERENCES kjv_book_name(kjv_book_name_pk) ON DELETE CASCADE,
    UNIQUE(kjv_book_name_fk, chapter_num, verse_num)
);

-- ============================================
-- 6. TAMIL TABLES
-- ============================================
CREATE TABLE tam_book_name (
    tam_book_name_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    book_details_fk INTEGER NOT NULL,
    book_name TEXT NOT NULL UNIQUE,
    book_short_name TEXT,
    FOREIGN KEY (book_details_fk) REFERENCES book_details(book_details_pk) ON DELETE CASCADE
);

CREATE TABLE tam_verses (
    tam_verse_pk INTEGER PRIMARY KEY AUTOINCREMENT,
    tam_book_name_fk INTEGER NOT NULL,
    chapter_num INTEGER NOT NULL,
    verse_num INTEGER NOT NULL,
    verse TEXT NOT NULL,
    FOREIGN KEY (tam_book_name_fk) REFERENCES tam_book_name(tam_book_name_pk) ON DELETE CASCADE,
    UNIQUE(tam_book_name_fk, chapter_num, verse_num)
);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================

-- KJV Indexes
-- FIXED: Removed non-existent columns (book_number, testament_fk, category_fk) from kjv_book_name table
CREATE INDEX idx_kjv_book_name_name ON kjv_book_name(book_name);
CREATE INDEX idx_kjv_book_name_short ON kjv_book_name(book_short_name);
CREATE INDEX idx_kjv_verses_lookup ON kjv_verses(kjv_book_name_fk, chapter_num, verse_num);

-- Tamil Indexes
-- FIXED: Removed non-existent columns (book_number, testament_fk, category_fk) from tam_book_name table
CREATE INDEX idx_tam_book_name_name ON tam_book_name(book_name);
CREATE INDEX idx_tam_book_name_short ON tam_book_name(book_short_name);
CREATE INDEX idx_tam_verses_lookup ON tam_verses(tam_book_name_fk, chapter_num, verse_num);

-- Composite indexes for common queries
-- FIXED: Removed references to non-existent columns (testament_fk, category_fk) in book_name tables
-- These indexes should be on book_details instead since that's where testament_fk and category_fk reside
CREATE INDEX idx_book_details_testament_category ON book_details(testament_fk, category_fk);
CREATE INDEX idx_book_details_book_number ON book_details(book_number);
CREATE INDEX idx_kjv_book_details_fk ON kjv_book_name(book_details_fk);
CREATE INDEX idx_tam_book_details_fk ON tam_book_name(book_details_fk);