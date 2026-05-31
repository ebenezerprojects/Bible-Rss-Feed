-- Single Verse Lookup
-- Parameters: :book_short_name, :chapter, :verse
SELECT 
    '{{version_code}}' as version_code,
    b.book_short_name,
    b.book_name,
    b.book_details_fk,
    v.chapter_num,
    v.verse_num,
    v.verse
FROM {{verse_table}} v
JOIN {{book_table}} b ON b.{{book_pk}} = v.{{verse_fk}}
JOIN book_details bd ON bd.book_details_pk = b.book_details_fk
WHERE bd.book_global_id = :book_short_name
AND v.chapter_num = :chapter
AND v.verse_num = :verse