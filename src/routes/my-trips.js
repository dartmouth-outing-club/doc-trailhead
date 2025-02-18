import * as utils from '../utils.js'

export function get(req, res) {
  const userId = req.user
  const _24_HOURS_IN_MS = 86400000
  const now = new Date()
  const leader_only = req.query.leader_only === 'true'

  const is_leader_query = `SELECT 1 as is_leader
                           FROM club_leaders 
                           WHERE user = ? and is_approved = TRUE`

  const is_leader = req.db.get(is_leader_query, userId)?.is_leader === 1

  const can_create_trip = res.locals.is_opo || is_leader

  const tripsQuery = `
        SELECT 
          trips.id, title, location, start_time, end_time, description, leader,
          coalesce(clubs.name, 'None') as club
        FROM trip_members
        JOIN trips ON trips.id = trip_members.trip
        LEFT JOIN clubs ON trips.club = clubs.id
        WHERE 
          trip_members.user = ?
          AND end_time > ?
          ${leader_only ? 'AND trip_members.leader = 1' : ''}
        ORDER BY start_time ASC
      `

  const trips = req.db.all(tripsQuery, userId, now.getTime() - _24_HOURS_IN_MS)
    .map(trip => ({
      ...trip,
      iconPath: utils.getClubIcon(trip.club),
      time_element: utils.getDatetimeRangeElement(trip.start_time, trip.end_time)
    }))

  res.render('views/my-trips.njk', {
    trips,
    can_create_trip,
    leader_only
  })
}
