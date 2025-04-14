import * as utils from '../../utils.js'

export function get(req, res) {
  // Params
  const beginnersOnly = req.query?.beginner_friendly === 'on'
  const subclub = parseInt(req.query?.subclub) || -1
  const search = req.query?.search
  const showPrivate = res.locals.is_opo

  // Date
  const now = new Date()

  const publicTrips = req.db.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      coalesce(clubs.name, 'None') as club
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ${now.getTime()}
    ${showPrivate ? '' : 'AND private = 0'}
    ${beginnersOnly ? 'AND experience_needed = 0' : ''}
    ${subclub !== -1 ? `AND club = ${subclub}` : ''}
    ${search ? `AND (title LIKE '%${search}%' OR description LIKE '%${search}%')` : ''}
    ORDER BY start_time ASC
  `)

  const trips = publicTrips.map(utils.formatForTripForTables)

  res.render('trip/all-tiles.njk', { trips })
}
