import * as utils from '../utils.js';

export function get(req, res) {
    const userId = req.user;
    const now = new Date();

    const leaderOnly = req.query.leaderOnly === 'true';

    const tripsQuery = `
      SELECT trips.id, title, location, start_time, end_time, description,
      COALESCE(clubs.name, 'None') as club
      FROM trip_members
      JOIN trips ON trips.id = trip_members.trip
      LEFT JOIN clubs ON trips.club = clubs.id
      WHERE trip_members.user = ? 
      AND end_time < ?
      ${leaderOnly ? 'AND trip_members.leader = 1' : ''}
      ORDER BY end_time DESC
    `;

    const tripsForUser = req.db.all(tripsQuery, userId, now.getTime());
    
    const trips = tripsForUser.map(trip => ({
        ...trip,
        iconPath: utils.getClubIcon(trip.club),
        time_element: utils.getDatetimeRangeElement(trip.start_time, trip.end_time)
    }));

    res.render('views/my-past-trips.njk', { trips, leader_only: leaderOnly, show_all: !leaderOnly });
}