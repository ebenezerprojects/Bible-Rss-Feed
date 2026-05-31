-- Verse Range
-- Parameters: :book_short_name, :start_chapter, :start_verse, :end_chapter, :end_verse

SELECT 
    b.book_name,
    b.book_short_name,
    v.chapter_num,
    v.verse_num,
    v.verse
FROM {{verse_table}} v
JOIN {{book_table}} b ON b.{{book_pk}} = v.{{verse_fk}}
JOIN book_details bd ON bd.book_details_pk = b.book_details_fk
WHERE bd.book_global_id = :book_short_name
AND (
    (v.chapter_num = :start_chapter AND v.verse_num >= :start_verse)
    OR (v.chapter_num > :start_chapter AND v.chapter_num < :end_chapter)
    OR (v.chapter_num = :end_chapter AND v.verse_num <= :end_verse)
)
ORDER BY v.chapter_num, v.verse_num