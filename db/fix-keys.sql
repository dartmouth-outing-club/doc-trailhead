UPDATE trips
SET owner = users.id
FROM users
WHERE users._id = trips.owner;

UPDATE trips
SET club = clubs.id
FROM clubs
WHERE clubs._id = trips.club;

UPDATE club_leaders
SET user = users.id
FROM users
WHERE users._id = club_leaders.user;

UPDATE club_leaders
SET club = clubs.id
FROM clubs
WHERE clubs._id = club_leaders.club;

UPDATE requested_vehicles
SET vehiclerequest = vehiclerequests.id
FROM vehiclerequests
WHERE vehiclerequests._id = requested_vehicles.vehiclerequest;

UPDATE trip_members
SET user = users.id
FROM users
WHERE users._id = trip_members.user;

UPDATE requested_vehicles
SET vehiclerequest = vehiclerequests.id
FROM vehiclerequests
WHERE vehiclerequests._id = requested_vehicles.vehiclerequest;
