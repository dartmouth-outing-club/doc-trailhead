BEGIN;

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
SET trip = trips.id
FROM trips
WHERE trips._id = trip_members.trip;

UPDATE trip_members
SET user = users.id
FROM users
WHERE users._id = trip_members.user;

UPDATE requested_vehicles
SET vehiclerequest = vehiclerequests.id
FROM vehiclerequests
WHERE vehiclerequests._id = requested_vehicles.vehiclerequest;

UPDATE assignments
SET vehiclerequest = vehiclerequests.id
FROM vehiclerequests
WHERE vehiclerequests._id = assignments.vehiclerequest;

UPDATE assignments
SET requester = users.id
FROM users
WHERE users._id = requester;

UPDATE assignments
SET vehicle = vehicles.id
FROM vehicles
WHERE vehicles._id = assignments.vehicle;

UPDATE vehiclerequests
SET trip = trips.id
FROM trips
WHERE trips._id = trip;

UPDATE vehiclerequests
SET requester = users.id
FROM users
WHERE users._id = requester;

UPDATE user_certs
SET user = users.id
FROM users
WHERE users._id = user;

UPDATE trip_gear
SET trip = trips.id
FROM trips
WHERE trips._id = trip;

UPDATE member_gear_requests
SET user = users.id
FROM users
WHERE users._id = user;

UPDATE member_gear_requests
SET trip = trips.id
FROM trips
WHERE trips._id = trip;

UPDATE member_gear_requests
SET gear = trip_gear.id
FROM trip_gear
WHERE trip_gear._id = gear;

UPDATE group_gear_requests
SET trip = trips.id
FROM trips
WHERE trips._id = trip;

DELETE FROM assignments
WHERE vehiclerequest NOT IN
  (SELECT id FROM vehiclerequests);

COMMIT;
