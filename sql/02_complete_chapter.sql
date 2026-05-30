-- Complete Chapter
-- Parameters: :book_short_name, :chapter
SELECT 
    v.verse_num,
    v.verse,
    b.book_name,
    b.book_short_name,
    bd.chapter_count
FROM {{verse_table}} v
JOIN {{book_table}} b ON b.{{book_pk}} = v.{{verse_fk}}
JOIN book_details bd ON bd.book_details_pk = b.book_details_fk
WHERE b.book_short_name = :book_short_name
AND v.chapter_num = :chapter
ORDER BY v.verse_num