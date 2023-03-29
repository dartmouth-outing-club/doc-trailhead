ALTER TABLE users
ADD COLUMN height_inches INTEGER;

UPDATE users
SET height_inches = (cast(substring(height, 1, 1) as integer) * 12) + (cast(substring(height, 3) as integer))
WHERE height IS NOT NULL;

ALTER TABLE users
DROP COLUMN height;

