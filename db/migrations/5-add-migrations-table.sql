CREATE TABLE _migrations (
  name TEXT NOT NULL,
  timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
) STRICT;

-- insert the migrations we've already made
INSERT INTO _migrations (name)
VALUES
  ('1-add-profile-complete-row.sql'),
  ('2-drop-mongo-id-column.sql'),
  ('3-sessions-default-timestamp.sql'),
  ('4-set-pcard-defaults.sql'),
  ('5-add-migrations-table.sql');
