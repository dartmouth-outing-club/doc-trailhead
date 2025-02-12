import * as utils from '../utils.js'

const LEGAL_VIEWS = ['list', 'tiles']

export function get(req, res) {
  const now = new Date()
  const view = LEGAL_VIEWS.includes(req.query?.view) ? req.query.view : 'tiles'

  const beginners_only = req.query?.beginnersOnly === 'true'
  const showPrivate = res.locals.is_opo
  const userId = req.user

  const trips = req.db.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      coalesce(clubs.name, 'None') as club,
      trip_members.pending as status,
      trip_members.leader as is_leader
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    LEFT JOIN trip_members on trips.id = trip_members.trip AND trip_members.user = ?
    WHERE start_time > ?
    ${showPrivate ? '' : 'AND private = 0'}
    ${beginners_only ? 'AND experience_needed = 0' : ''}
    ORDER BY start_time ASC
  `, userId, now.getTime()).map(trip => {
    const formattedTrip = utils.formatForTripForTables(trip)

    // Set the status of the trip
    if (trip.status === null) {
      formattedTrip.status = 'not-joined'
    } else if (trip.is_leader) {
      formattedTrip.status = 'leader'
    } else if (trip.status === 0) {
      formattedTrip.status = 'approved'
    } else {
      formattedTrip.status = 'pending'
    }

    return formattedTrip
  })

  res.render('views/all-trips.njk', { trips, view, beginners_only })
}
