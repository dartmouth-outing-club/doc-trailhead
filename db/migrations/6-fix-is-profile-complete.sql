ALTER TABLE users
DROP COLUMN is_profile_complete;

ALTER TABLE users
ADD COLUMN is_profile_complete INTEGER GENERATED ALWAYS AS (
    id IS NOT NULL AND name IS NOT NULL
) VIRTUAL;
