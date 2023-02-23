CREATE TABLE trip_pcard_requests_new (
  trip INTEGER UNIQUE NOT NULL REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  is_approved INTEGER,
  assigned_pcard TEXT,
  num_people INTEGER NOT NULL DEFAULT 0,
  snacks INTEGER NOT NULL DEFAULT 0,
  breakfast INTEGER NOT NULL DEFAULT 0,
  lunch INTEGER NOT NULL DEFAULT 0,
  dinner INTEGER NOT NULL DEFAULT 0,
  other_costs TEXT NOT NULL DEFAULT '[]' -- Deprecated, no longer in use
) STRICT;

INSERT INTO trip_pcard_requests_new (
  trip, is_approved, assigned_pcard, num_people, snacks, breakfast, lunch, dinner, other_costs
) SELECT
  trip,
  is_approved,
  assigned_pcard,
  iif(num_people = '' OR num_people IS NULL, 0, num_people) as num_people,
  iif(snacks = '' OR snacks IS NULL, 0, snacks) as snacks,
  iif(breakfast = '' OR breakfast IS NULL, 0, breakfast) as breakfast,
  iif(lunch = '' OR lunch IS NULL, 0, lunch) as lunc,
  iif(dinner = '' OR dinner IS NULL, 0, dinner) as dinner,
  other_costs
FROM trip_pcard_requests;
DROP TABLE trip_pcard_requests;
ALTER TABLE trip_pcard_requests_new RENAME TO trip_pcard_requests;
