import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'
import { getClubIcon } from '../utils.js'

export function get (_req, res) {
  const now = new Date()
  const publicTrips = sqlite.all(`
    SELECT title, location, start_time, end_time, clubs.name as club
    FROM trips
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ? AND private = 0
    ORDER BY start_time ASC
    LIMIT 5
  `, now.getTime())

  const cards = publicTrips
    .map(trip => ({ ...trip, iconPath: getClubIcon(trip.club) }))
    .map(trip => `
<div class=trip-card>
  <img class=club-logo src="${trip.iconPath}">
  <h2>${trip.title}</h2>
  <hr/>
  <div>
    <h3>${trip.location}</h3>
    <p>${utils.getDatetimeRangeElement(trip.start_time, trip.end_time)}</p>
  </div>
</div>
`).join('')
  res.send(cards).status(200)
}
