-- Word Search with Filters
-- Parameters: :keyword (required), :testament (optional), :book_short_name (optional), 
--             :book_start (optional), :book_end (optional), :limit (required)

SELECT 
    b.book_name,
    b.book_short_name,
    bd.book_number,
    t.testament_name,
    c.category_name,
    v.chapter_num,
    v.verse_num,
    v.verse,
    INSTR(LOWER(v.verse), LOWER(:keyword)) as position
FROM {{verse_table}} v
JOIN {{book_table}} b ON b.{{book_pk}} = v.{{verse_fk}}
JOIN book_details bd ON bd.book_details_pk = b.book_details_fk
JOIN testament t ON t.testament_pk = bd.testament_fk
JOIN category c ON c.category_pk = bd.category_fk
WHERE LOWER(v.verse) LIKE LOWER('%' || :keyword || '%')
{{testament_filter}}
{{book_filter}}
{{range_filter}}
ORDER BY position, bd.book_number, v.chapter_num, v.verse_num
LIMIT :limit