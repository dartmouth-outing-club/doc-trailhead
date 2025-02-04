import * as utils from '../utils.js'

export function get(req, res) {
  const now = new Date()

  const showPrivate = res.locals.is_opo

  const publicTrips = req.db.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      coalesce(clubs.name, 'None') as club
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ?
    ${showPrivate ? '' : 'AND private = 0'}
    ORDER BY start_time ASC
  `, now.getTime())

  const trips = publicTrips.map(utils.formatForTripForTables)

  // Clubs, sorted by name
  const clubs = req.db.all('SELECT id, name FROM clubs')
    .sort((a, b) => a.name.localeCompare(b.name))

  res.render('views/all-trips.njk', { trips, clubs })
}
