import * as utils from '../utils.js'

export function get(req, res) {
  const userId = req.user
  const _24_HOURS_IN_MS = 86400000
  const now = new Date()

  const is_leader = req.db.get(`
    SELECT 1 as is_leader
    FROM club_leaders WHERE user = ? and is_approved = TRUE`, req.user)?.is_leader === 1
  const can_create_trip = res.locals.is_opo || is_leader

  const tripsForUser = req.db.all(`
    SELECT trips.id, title, location, start_time, end_time, description,
    coalesce(clubs.name, 'None') as club, leader
    FROM trip_members
    LEFT JOIN trips ON trips.id = trip_members.trip
    LEFT JOIN clubs ON trips.club = clubs.id
    WHERE trip_members.user = ? AND end_time > ?
    ORDER BY start_time ASC
  `, userId, now.getTime() - _24_HOURS_IN_MS)

  const trips = tripsForUser.map(trip => ({
    ...trip,
    iconPath: utils.getClubIcon(trip.club),
    time_element: utils.getDatetimeRangeElement(trip.start_time, trip.end_time)
  }))

  res.render('views/my-trips.njk', { can_create_trip, trips })
}
