.mode csv
.headers on

.once users.csv
SELECT id, pronoun
FROM users;

.once users.csv
SELECT id, pronoun
FROM users;

.once clubs.csv
SELECT id, name, active
FROM clubs;

.once trips.csv
SELECT
    id,
    club,
    title,
    start_time,
    end_time,
    location,
    description,
    plan
FROM trips;

.once trip_members.csv
SELECT trip, user, leader, pending
FROM trip_members;

