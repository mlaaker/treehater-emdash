-- Point imported content at the Worker's copy of the WordPress uploads
-- (public/wp-content/uploads/, same paths), whichever scheme/host the post used.
-- Run after the content import, before anyone edits posts (edits create revisions).
--   npx wrangler d1 execute treehater-emdash-db-v2 --remote --file migration/rewrite-upload-urls.sql
UPDATE ec_posts SET content = replace(replace(replace(replace(content,
	'https://www.treehater.com/wp-content/uploads/', '/wp-content/uploads/'),
	'http://www.treehater.com/wp-content/uploads/', '/wp-content/uploads/'),
	'https://treehater.com/wp-content/uploads/', '/wp-content/uploads/'),
	'http://treehater.com/wp-content/uploads/', '/wp-content/uploads/')
WHERE content LIKE '%treehater.com/wp-content/uploads/%';
-- /let-them-feast-on-their-own-flesh/ has a typo'd host (wwwr.), broken on WordPress too.
UPDATE ec_posts SET content = replace(content, 'http://wwwr.treehater.com/wp-content/uploads/', '/wp-content/uploads/')
WHERE content LIKE '%wwwr.treehater.com/wp-content/uploads/%';
UPDATE ec_pages SET content = replace(replace(replace(replace(content,
	'https://www.treehater.com/wp-content/uploads/', '/wp-content/uploads/'),
	'http://www.treehater.com/wp-content/uploads/', '/wp-content/uploads/'),
	'https://treehater.com/wp-content/uploads/', '/wp-content/uploads/'),
	'http://treehater.com/wp-content/uploads/', '/wp-content/uploads/')
WHERE content LIKE '%treehater.com/wp-content/uploads/%';
