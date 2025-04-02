PRAGMA foreign_keys=OFF;

-- Delete some stray foreign key violators
DELETE FROM trip_members
WHERE rowid in (39003, 39004, 39005, 39006, 39007, 45584);


CREATE TABLE new_trip_members (
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  leader INTEGER DEFAULT FALSE,
  attended INTEGER DEFAULT FALSE,
  pending INTEGER DEFAULT TRUE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (trip, user)
) STRICT;

INSERT INTO new_trip_members (trip, user, leader, attended, pending)
SELECT trip, user, leader, attended, pending
FROM trip_members;

DROP TABLE trip_members;

ALTER TABLE new_trip_members
RENAME to trip_members;

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
