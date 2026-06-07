SELECT 
    b.book_name,
    b.book_short_name,
    v.chapter_num,
    v.verse_num,
    v.verse
FROM {{verse_table}} v
JOIN {{book_table}} b ON b.{{book_pk}} = v.{{verse_fk}}
JOIN book_details bd ON bd.book_details_pk = b.book_details_fk
JOIN testament t ON t.testament_pk = bd.testament_fk
WHERE v.verse LIKE :keyword
{{testament_filter}}
{{book_filter}}
{{range_filter}}
ORDER BY bd.book_number, v.chapter_num, v.verse_num
LIMIT :limit