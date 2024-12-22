import * as utils from '../utils.js'

export function get(req, res) {
  const now = new Date()
  const show_list = req.query?.view === 'list'
  const beginners_only = req.query?.beginnersOnly === 'true'
  const showPrivate = res.locals.is_opo

  const publicTrips = req.db.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      clubs.name as club
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ?
    ${showPrivate ? '' : 'AND private = 0'}
    ${beginners_only ? 'AND experience_needed = 0' : ''}
    ORDER BY start_time ASC
  `, now.getTime())

  const trips = publicTrips.map(utils.formatForTripForTables)

  res.render('views/all-trips.njk', { trips, show_list, beginners_only })
}
