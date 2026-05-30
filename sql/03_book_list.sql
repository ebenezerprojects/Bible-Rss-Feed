-- Book List with Testament and Category Information
-- Parameters: none
SELECT 
    bd.book_number,
    b.book_name,
    b.book_short_name,
    bd.chapter_count,
    t.testament_name,
    c.category_name
FROM {{book_table}} b
JOIN book_details bd ON bd.book_details_pk = b.book_details_fk
JOIN testament t ON t.testament_pk = bd.testament_fk
JOIN category c ON c.category_pk = bd.category_fk
ORDER BY bd.book_number