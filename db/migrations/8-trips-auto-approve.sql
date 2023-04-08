ALTER TABLE trips
ADD COLUMN auto_approved_members INTEGER NOT NULL DEFAULT 0;

ALTER TABLE trip_members
ADD COLUMN added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'));