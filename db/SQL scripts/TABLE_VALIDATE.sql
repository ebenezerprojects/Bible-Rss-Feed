-- ============================================
-- VALIDATION USING ONLY SQL (NO DOT COMMANDS)
-- ============================================

-- 1. List all tables
SELECT name AS table_name 
FROM sqlite_master 
WHERE type='table' 
AND name NOT LIKE 'sqlite_%'
ORDER BY name;

-- 2. List all indexes
SELECT 
    name AS index_name,
    tbl_name AS table_name
FROM sqlite_master 
WHERE type='index' 
AND name NOT LIKE 'sqlite_%'
ORDER BY tbl_name, name;

-- 3. Check table structures (one by one)
SELECT 'testament' AS table_name, name AS column_name, type, "notnull", dflt_value, pk
FROM pragma_table_info('testament')
UNION ALL
SELECT 'category', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('category')
UNION ALL
SELECT 'book_details', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('book_details')
UNION ALL
SELECT 'bible_version', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('bible_version')
UNION ALL
SELECT 'kjv_book_name', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('kjv_book_name')
UNION ALL
SELECT 'kjv_verses', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('kjv_verses')
UNION ALL
SELECT 'tam_book_name', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('tam_book_name')
UNION ALL
SELECT 'tam_verses', name, type, "notnull", dflt_value, pk
FROM pragma_table_info('tam_verses')
ORDER BY table_name, pk DESC, name;

-- 4. Count total tables
SELECT COUNT(*) AS total_tables
FROM sqlite_master 
WHERE type='table' 
AND name NOT LIKE 'sqlite_%';

-- 5. Count total indexes
SELECT COUNT(*) AS total_indexes
FROM sqlite_master 
WHERE type='index' 
AND name NOT LIKE 'sqlite_%';

-- 6. Verify specific expected tables exist
SELECT 
    'testament' AS expected_table,
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='testament') 
         THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'category', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='category') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'book_details', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='book_details') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'bible_version', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='bible_version') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'kjv_book_name', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='kjv_book_name') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'kjv_verses', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='kjv_verses') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'tam_book_name', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='tam_book_name') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'tam_verses', 
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='tam_verses') 
         THEN 'EXISTS' ELSE 'MISSING' END;

-- 7. Verify expected indexes exist
SELECT 
    'idx_kjv_book_name_name' AS expected_index,
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_kjv_book_name_name') 
         THEN 'EXISTS' ELSE 'MISSING' END AS status
UNION ALL
SELECT 'idx_kjv_book_name_short',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_kjv_book_name_short') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_kjv_verses_lookup',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_kjv_verses_lookup') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_tam_book_name_name',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_tam_book_name_name') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_tam_book_name_short',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_tam_book_name_short') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_tam_verses_lookup',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_tam_verses_lookup') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_book_details_testament_category',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_book_details_testament_category') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_book_details_book_number',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_book_details_book_number') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_kjv_book_details_fk',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_kjv_book_details_fk') 
         THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT 'idx_tam_book_details_fk',
    CASE WHEN EXISTS(SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_tam_book_details_fk') 
         THEN 'EXISTS' ELSE 'MISSING' END;

-- 8. Check foreign key constraints
SELECT 
    tbl_name AS table_name,
    sql AS create_statement
FROM sqlite_master 
WHERE type='table' 
AND sql LIKE '%FOREIGN KEY%'
AND name NOT LIKE 'sqlite_%';

-- 9. Check foreign key enforcement status
PRAGMA foreign_keys;