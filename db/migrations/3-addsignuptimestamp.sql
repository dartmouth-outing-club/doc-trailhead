ALTER TABLE trip_members
ADD COLUMN signed_up_on INTEGER DEFAULT NULL;

UPDATE trip_members SET signed_up_on = (unixepoch() * 1000);