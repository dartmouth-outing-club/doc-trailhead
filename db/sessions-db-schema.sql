CREATE TABLE tokens (
  user INTEGER NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  timestamp INTEGER NOT NULL
) STRICT;
