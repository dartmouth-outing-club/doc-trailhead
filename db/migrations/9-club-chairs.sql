CREATE TABLE club_chairs (
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  club INTEGER REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
  is_approved INTEGER NOT NULL DEFAULT FALSE,
  chair_since INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user, club)
) STRICT;


alter table club_leaders ADD column chair_approved INTEGER NOT NULL DEFAULT FALSE;
alter table club_leaders RENAME column is_approved to opo_approved;

-- ensure anybody currently approved is backfilled to be chair approved
update club_leaders SET chair_approved = CASE when opo_approved = 1 then chair_approved = 1 else 0 end;
