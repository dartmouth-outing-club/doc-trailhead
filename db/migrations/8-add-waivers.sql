CREATE TABLE waiver_signatures (
  id INTEGER PRIMARY KEY,
  user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
  waiver_fp TEXT NOT NULL,
  waiver_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL
) STRICT;

CREATE TABLE trip_required_waivers (
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT NOT NULL,
  waiver_fp TEXT NOT NULL
) STRICT;

CREATE TABLE club_required_waivers (
  club INTEGER REFERENCES clubs ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT NOT NULL,
  waiver_fp TEXT NOT NULL
) STRICT;

INSERT INTO club_required_waivers VALUES (4, 'CnT Waiver', 'cabin-and-trail-waiver.html');
