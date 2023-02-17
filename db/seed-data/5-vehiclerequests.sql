-- vehiclerequests

INSERT INTO vehiclerequests
    (requester, request_details, mileage, num_participants, trip, request_type, is_approved)
VALUES
    (1, 'Need vehicle for trip', 30, 5, 1, 'TRIP', 1),
    (1, 'Need vehicle for trip', 50, 3, 2, 'TRIP', 1),
    (1, 'Need two vehicles for trip', 80, 4, 3, 'TRIP', 1),
    (1, 'Need vehicle for trip', 40, 4, 5, 'TRIP', NULL),
    (1, 'Need vehicle for trip', 120, 5, 6, 'TRIP', 0),
    (1, 'I need a vehicle to carry groceries for a feed.', 15, 1, NULL, 'SOLO', NULL);

-- requested_vehicles

WITH start_end_times AS
    (SELECT vehiclerequests.id, trips.start_time, trips.end_time FROM vehiclerequests LEFT JOIN trips ON vehiclerequests.trip == trips.id)
INSERT INTO requested_vehicles
    (vehiclerequest, type, details, trailer_needed, pass_needed, pickup_time, return_time)
VALUES
    (1, 'Microbus', 'Use key 4', 1, 0, (SELECT start_time FROM start_end_times WHERE id = 1), (SELECT end_time FROM start_end_times WHERE id = 1)),
    (2, 'Van', 'Use key 1', 0, 1, (SELECT start_time FROM start_end_times WHERE id = 2), (SELECT end_time FROM start_end_times WHERE id = 2)),
    (3, 'Van', 'Use key 8', 0, 0, (SELECT start_time FROM start_end_times WHERE id = 3), (SELECT end_time FROM start_end_times WHERE id = 3)),
    (3, 'Van', 'Use key 3', 0, 0, (SELECT start_time FROM start_end_times WHERE id = 3), (SELECT end_time FROM start_end_times WHERE id = 2)),
    (4, 'Microbus', 'Use key 6', 0, 1, (SELECT start_time FROM start_end_times WHERE id = 4), (SELECT end_time FROM start_end_times WHERE id = 4)),
    (5, 'Van', 'Use key 1', (SELECT unixepoch('now','start of day', '+17 hours', 'utc') * 1000), (SELECT unixepoch('now','start of day', '+19 hours', 'utc') * 1000), 0, 0);

-- assignments

WITH start_end_times AS
    (SELECT vehiclerequests.id, trips.start_time, trips.end_time FROM vehiclerequests LEFT JOIN trips ON vehiclerequests.trip == trips.id)
INSERT INTO assignments
    (vehiclerequest, requester, vehicle, vehicle_key, picked_up, returned, pickup_time, return_time)
VALUES
    (1, 1, 1, 'Key 4', 1, 1, (SELECT start_time FROM start_end_times WHERE id = 1), (SELECT end_time FROM start_end_times WHERE id = 1)),
    (2, 1, 2, 'Key 1', 1, 0, (SELECT start_time FROM start_end_times WHERE id = 2), (SELECT end_time FROM start_end_times WHERE id = 2)),
    (3, 1, 3, 'Key 8', 0, 1, (SELECT start_time FROM start_end_times WHERE id = 3), (SELECT end_time FROM start_end_times WHERE id = 3)),
    (3, 1, 3, 'Key 3', 0, 1, (SELECT start_time FROM start_end_times WHERE id = 3), (SELECT end_time FROM start_end_times WHERE id = 3));