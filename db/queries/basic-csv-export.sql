.mode csv
.headers on

.once users.csv
SELECT id, name, cas_id, net_id, pronoun
FROM users;

.once clubs.csv
SELECT
    id,
    name,
    iif(active, "TRUE", "FALSE") as is_active
FROM clubs;

.once trips.csv

SELECT
    id,
    club,
    title,
    datetime(start_time /1000, 'unixepoch', 'localtime') as start_time,
    datetime(end_time /1000, 'unixepoch', 'localtime') as end_time,
    location,
    description,
    plan
FROM trips;

.once trip_members.csv
SELECT
    trip,
    user,
    iif(leader, "TRUE", "FALSE") as is_leader,
    iif(pending, "TRUE", "FALSE") as is_pending
FROM trip_members;

