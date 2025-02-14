import * as utils from '../utils.js';

export function get(req, res) {
    const userId = req.user;
    const _24_HOURS_IN_MS = 86400000;
    const now = new Date();
    const showAll = req.query.showAll === 'true';
    const leaderOnly = req.query.leaderOnly === 'true';


    const isLeaderQuery = `SELECT 1 as is_leader
                           FROM club_leaders 
                           WHERE user = ? and is_approved = TRUE`;

    const is_leader = req.db.get(isLeaderQuery, userId)?.is_leader === 1;

    const can_create_trip = res.locals.is_opo || is_leader;

    const tripsQuery = `
        SELECT trips.id, title, location, start_time, end_time, description, leader,
        COALESCE(clubs.name, 'None') as club
        FROM trip_members
        LEFT JOIN trips ON trips.id = trip_members.trip
        LEFT JOIN clubs ON trips.club = clubs.id
        WHERE trip_members.user = ?
        AND end_time > ?
        ${leaderOnly ? 'AND trip_members.leader = 1' : ''}
        ORDER BY start_time ASC
    `;

    const tripsForUser = req.db.all(tripsQuery, userId, now.getTime() - _24_HOURS_IN_MS);

    res.render('views/my-trips.njk', {
        trips: tripsForUser,
        can_create_trip,
        leader_only: leaderOnly,
        show_all: showAll
    });
}