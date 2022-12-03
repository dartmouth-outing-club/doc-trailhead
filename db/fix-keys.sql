UPDATE club_leaders
SET user = users.id
FROM users
WHERE users._id = club_leaders.user;

UPDATE club_leaders
SET club = clubs.id
FROM clubs
WHERE clubs._id = club_leaders.club;
