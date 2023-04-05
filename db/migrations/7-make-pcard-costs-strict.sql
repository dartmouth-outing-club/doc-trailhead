CREATE TABLE pcard_request_costs_new (
  id INTEGER PRIMARY KEY,
  trip INTEGER REFERENCES trips ON DELETE CASCADE ON UPDATE CASCADE,
  name TEXT,
  cost INTEGER
) STRICT;

INSERT INTO pcard_request_costs_new (id, trip, name, cost)
SELECT id, trip, name, cost
FROM pcard_request_costs;

DROP TABLE pcard_request_costs;
ALTER TABLE pcard_request_costs_new RENAME TO pcard_request_costs;
