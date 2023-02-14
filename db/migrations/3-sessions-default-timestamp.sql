CREATE TABLE tokens_new (
  user INTEGER NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  timestamp INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
) STRICT;

INSERT INTO tokens_new(user, token, timestamp) SELECT user, token, timestamp FROM tokens;
DROP TABLE tokens;
ALTER TABLE tokens_new RENAME TO tokens;
