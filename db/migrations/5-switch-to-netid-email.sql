ALTER TABLE users
RENAME COLUMN email to old_email;

ALTER TABLE users
ADD COLUMN email TEXT GENERATED ALWAYS AS (
    iif(net_id is not null, net_id || '@dartmouth.edu', null)
) VIRTUAL;
