-- TRIP 1

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (1, 'Moosilauke Stargazing', 0, 1, 1, 1, 0, 4, 1,
        (unixepoch('now', 'start of day', '-1 days', '+20 hours', 'utc') * 1000),
        ((unixepoch('now', 'start of day', '-1 days', '+20 hours', 'utc') * 1000) + 3600000 * 6),
        'Moosilauke Mountain', 'Robo', 'Robo', 15, 'Hike Moosilauke and eat a meal at the lodge later.', 0, 0, NULL, NULL);

INSERT INTO trip_pcard_requests
    (trip, is_approved, assigned_pcard, num_people, snacks, breakfast, lunch, dinner, other_costs)
VALUES
    (1, 1, '123456789', 3, 15, 0, 0, 0, '[]');

INSERT INTO trip_required_gear
    (id, trip, name, size_type)
VALUES
    (1, 1, 'Sleeping bag', 'Height'),
    (2, 1, 'Headlamp', 'None'),
    (3, 1, 'Microspikes', 'Shoe');

INSERT INTO trip_members VALUES
    (1, 1, 1, 1, 0, (strftime('%s', 'now') * 1000)),
    (1, 2, 1, 1, 0, (strftime('%s', 'now') * 1000)),
    (1, 3, 0, 1, 0, (strftime('%s', 'now') * 1000));

INSERT INTO member_gear_requests
    (trip, user, gear)
VALUES
    (1, 2, 1),
    (1, 2, 2),
    (1, 2, 3),
    (1, 3, 1),
    (1, 3, 3);

-- TRIP 2

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (2, 'Hartland Dinertour', 0, 0, 0, 0, 0, 4, 1,
    (SELECT unixepoch('now', 'start of day', '+1 day', '+6 hours', 'utc') * 1000),
    ((SELECT unixepoch('now', 'start of day', '+1 day', '+6 hours', 'utc') * 1000) + 3600000 * 3),
    'Hartland Diner', 'Robo', 'Robo', 20, 'BREAKFAST. IS. SO. IMPORTANT. Dinertoure is a subclub of Cabin & Trail, which makes it a sub-subclub of the DOC. Every week we wake up very early and go to a different diner in the Upper Valley. The ride is free but BRING. SMALL. BILLS. Well be leaving from Robo at 6:35 sharp and driving to The Windsor Diner in Windsor, VT. So dont be late. Since space is limited please only sign-up if you are committed to coming.', 0, 0, NULL, NULL);

INSERT INTO trip_members VALUES
    (2, 1, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (2, 2, 0, 0, 0, (strftime('%s', 'now') * 1000)),
    (2, 3, 0, 0, 1, (strftime('%s', 'now') * 1000));

-- TRIP 3

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (3, 'Cardigan Sunrikeeee ☀️', 0, 0, 0, 0, 0, 4, 1,
    (SELECT unixepoch('now', 'start of day', '+2 days', '+5 hours', 'utc') * 1000),
    ((SELECT unixepoch('now', 'start of day', '+2 days', '+5 hours', 'utc') * 1000) + 3600000 * 2),
    'Mount Cardigan', 'Robo', 'Robo', 0, 'A beautiful afternoon Cardigan hike! We will leave from behind robo at 2:50 and hike up Cardigan in some beautiful high 30s-mid 40s (F) weather and then return back to campus by 7:30 pm.  This is a beginner hike! The trip will be a little over four miles, the first half being entirely uphill. Tripees should feel comfortable walking continuously for 1-2 hours with some incline and then walking back down in the dark with headlamps. Please wear sturdy walking/hiking boots, non-cotton socks, comfortable outdoor pants, warm gloves, a warm hat, and a few layers (fleece/mid-layer, non-cotton base layer, and an outer shell jacket). Also bring at least 1L of water, a headlamp, and a backpack to carry your layers. It will be warm but temperatures can drop quickly and it never hurts to be prepared! any and all gear listed above can be requested for free!! Snacks will be provided!', 0, 0, NULL, NULL);

INSERT INTO trip_pcard_requests
    (trip, is_approved, assigned_pcard, num_people, snacks, breakfast, lunch, dinner, other_costs)
VALUES
    (3, NULL, '123456789', 4, 15, 0, 0, 0, '[]');

INSERT INTO trip_required_gear
    (id, trip, name, size_type)
VALUES
    (4, 3, 'Headlamp', 'none'),
    (5, 3, 'Microspikes', 'Shoe');

INSERT INTO trip_members VALUES
    (3, 1, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (3, 3, 1, 0, 1, (strftime('%s', 'now') * 1000)),
    (3, 4, 0, 0, 1, (strftime('%s', 'now') * 1000)),
    (3, 5, 0, 0, 1, (strftime('%s', 'now') * 1000));

INSERT INTO member_gear_requests
    (trip, user, gear)
VALUES
    (3, 1, 4),
    (3, 1, 5),
    (3, 3, 5),
    (3, 4, 5),
    (3, 5, 4);

-- TRIP 4

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (4, 'Killington Boarders!', 0, 0, 0, 0, 0, 15, 1,
    (SELECT unixepoch('now', 'start of day', '+1 day', '+8 hours', 'utc') * 1000),
    ((SELECT unixepoch('now', 'start of day', '+1 day', '+8 hours', 'utc') * 1000) + 3600000 * 6),
    'Killington Resort', 'Robo', 'Robo', 80, 'A half-day at Killington!  Open to snowboarders and skiers alike, but you gotta be able to connect s-turns and stop on both sides on green terrain. This is just gonna be a quick fun run. Bring your own gear!  Well head out from Robo at 9 am and be back on campus around 2 pm.  See yall there!', 0, 0, NULL, NULL);

INSERT INTO trip_required_gear
    (id, trip, name, size_type)
VALUES
    (6, 4, 'Bavaclava', 'none'),
    (7, 4, 'Gloves', 'none'),
    (8, 4, 'Helmet', 'none');

INSERT INTO trip_members VALUES
    (4, 1, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (4, 2, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (4, 4, 0, 0, 0, (strftime('%s', 'now') * 1000)),
    (4, 5, 0, 0, 1, (strftime('%s', 'now') * 1000));

INSERT INTO member_gear_requests
    (trip, user, gear)
VALUES
    (4, 1, 6),
    (4, 1, 7),
    (4, 1, 8),
    (4, 2, 6),
    (4, 2, 7),
    (4, 2, 8),
    (4, 4, 6),
    (4, 4, 7),
    (4, 4, 8),
    (4, 5, 6),
    (4, 5, 7),
    (4, 5, 8);

-- TRIP 5

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (5, 'POCO x NAD Sugaring Trip!🍁🥞', 0, 0, 0, 0, 0, 11, 1,
    (SELECT unixepoch('now', 'start of day', '+4 days', '+11 hours', 'utc') * 1000),
    ((SELECT unixepoch('now', 'start of day', '+4 days', '+11 hours', 'utc') * 1000) + 3600000 * 4), 'O-Farm', 'Robo', 'Robo', 0, 'Hi Hi, the collab of the century is finally here! Join Melody (she/her), Kevin (he/him) on a  POCO x NAD (Native Americans at Dartmouth) sugaring trip. Well be tapping some trees and learning about how maple syrup (yumm) is made. No past experience needed, just come have fun and end your week seven on a sweet note! :)', 0, 0, NULL, NULL);

INSERT INTO trip_members VALUES
    (5, 1, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (5, 2, 0, 0, 1, (strftime('%s', 'now') * 1000)),
    (5, 3, 0, 0, 1, (strftime('%s', 'now') * 1000)),
    (5, 4, 0, 0, 1, (strftime('%s', 'now') * 1000)),
    (5, 5, 0, 0, 1, (strftime('%s', 'now') * 1000));

-- TRIP 6

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (6, 'Billings Overnight + Mount Moriah', 0, 0, 0, 0, 0, 4, 1,
    (SELECT unixepoch('now', 'start of day', '+3 days', '+14 hours', 'utc') * 1000),
    ((SELECT unixepoch('now', 'start of day', '+3 days', '+14 hours', 'utc') * 1000) + 3600000 * 22), 'Mount Billings', 'Robo', 'Robo', 15, 'You are hereby humbly requested to join Andrew (23 he/him) and Levi (26 he/him) going on a lovely cabin overnight before a trip up Mt. Moriah. Unfortunately there wont be any spooky abandoned mines and/or fantasy book demons of old threatening us (get it? ha ha...), but it will be a pretty serious hike, around 8.5 miles walk and 3, 261 feet of elevation gain, so be prepared for a bumpy ride! Well be having a very fun cabin overnight on Friday night, then hiking Saturday, back in time for dinner! It looks to be nice enough weather but quite chilly, with temperatures somewhere between 9°F and 16°F on Saturday morning on the mountain and only a bit above 0°F overnight. Be sure to bring or request a big backpack with a warm sleeping bag and warm hiking clothes. Also, well still be hiking in pretty wintry conditions, so we may have to end up using some fun winter hiking equipment like microspikes.', 0, 0, NULL, NULL);

INSERT INTO trip_pcard_requests
    (trip, is_approved, assigned_pcard, num_people, snacks, breakfast, lunch, dinner, other_costs)
VALUES
    (6, 0, '123456789', 5, 15, 20, 0, 20, '[{"title":"campsite ", "cost":"20"}]');

INSERT INTO trip_required_gear
    (id, trip, name, size_type)
VALUES
    (9, 6, 'Sleeping bag', 'Height'),
    (10, 6, 'Headlamp', 'none'),
    (11, 6, 'Crampons', 'Shoe');

INSERT INTO group_gear_requests
    (trip, name, quantity)
VALUES
    (6, 'Tent', 2);

INSERT INTO trip_members VALUES
    (6, 1, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (6, 2, 1, 0, 0, (strftime('%s', 'now') * 1000)),
    (6, 3, 0, 0, 0, (strftime('%s', 'now') * 1000)),
    (6, 4, 0, 0, 0, (strftime('%s', 'now') * 1000));

-- TRIP 7

INSERT INTO trips
    (id, title, private, past, left, returned, marked_late, club, owner, start_time, end_time, location, pickup, dropoff, cost, description, experience_needed, coleader_can_edit, group_gear_approved, member_gear_approved)
VALUES
    (7, 'Private trip for bug testing', 1, 1, 1, 1, 1, 4, 1,
    (SELECT unixepoch('now', 'start of day', '+5 days', 'utc') * 1000),
    ((SELECT unixepoch('now', 'start of day', '+5 days', 'utc') * 1000) + 3600000 * 22),
    'The null space', 'main()', 'return;', 15, 'This trip should be private and marked late.', 0, 0, NULL, NULL);