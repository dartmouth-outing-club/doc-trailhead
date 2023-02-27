import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'
import { getClubIcon } from '../utils.js'

export function get (req, res) {
  const now = new Date()
  const show_list = req.query?.view === 'list'
  const showPrivate = res.locals.is_opo

  const publicTrips = sqlite.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      clubs.name as club
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ? ${showPrivate ? '' : 'AND private = 0'}
    ORDER BY start_time ASC
  `, now.getTime())

  const trips = publicTrips.map(trip => {
    const title = trip.title.length < 38 ? trip.title : trip.title.substring(0, 38) + '...'
    const description = trip.description.length < 190
      ? trip.description
      : trip.description.substring(0, 190) + '...'
    return {
      ...trip,
      title,
      description,
      icon_path: getClubIcon(trip.club),
      time_element: utils.getDatetimeRangeElement(trip.start_time, trip.end_time)
    }
  })
  res.render('views/all-trips.njk', { trips, show_list })
}
