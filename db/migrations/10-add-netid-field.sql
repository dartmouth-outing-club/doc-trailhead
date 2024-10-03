ALTER TABLE users ADD COLUMN net_id TEXT;

CREATE UNIQUE INDEX user_netid_unique ON users (net_id);
