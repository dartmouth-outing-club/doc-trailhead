import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'
import { getClubIcon } from '../utils.js'

export function get (_req, res) {
  const now = new Date()
  const publicTrips = sqlite.all(`
    SELECT trips.id, title, location, start_time, end_time, description, clubs.name as club
    FROM trips
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ? AND private = 0
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
      start_time_element: utils.getShortTimeElement(trip.start_time),
      end_time_element: utils.getShortTimeElement(trip.end_time)
    }
  })
  res.render('views/all-trips.njk', { trips })
}
