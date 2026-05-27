CREATE TABLE club_leader_requests (
    user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
    club INTEGER REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
    chair_approved INTEGER NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user, club)
);

CREATE TABLE club_chair_requests (
    user INTEGER REFERENCES users ON DELETE CASCADE ON UPDATE CASCADE,
    club INTEGER REFERENCES clubs ON DELETE RESTRICT ON UPDATE CASCADE,
    PRIMARY KEY (user, club)
);

ALTER TABLE club_leaders ADD COLUMN is_chair INTEGER NOT NULL DEFAULT FALSE;
DROP TABLE club_chairs;

INSERT INTO club_leader_requests (user, club)
SELECT user, club
FROM club_leaders
WHERE opo_approved = FALSE;

DELETE FROM club_leaders WHERE opo_approved = FALSE;

ALTER TABLE club_leaders DROP COLUMN opo_approved;
ALTER TABLE club_leaders DROP COLUMN chair_approved;
