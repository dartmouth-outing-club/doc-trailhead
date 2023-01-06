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
    LIMIT 5
  `, now.getTime())

  const cards = publicTrips
    .map(trip => ({ ...trip, iconPath: getClubIcon(trip.club) }))
    .map(trip => {
      const title = trip.title.length < 38 ? trip.title : trip.title.substring(0, 38) + '...'
      return `
<div class=trip-card>
  <img src="${trip.iconPath}">
  <header>Trip #${trip.id}</header>
  <h2>${title}</h2>
  <div>
    ${utils.getTimeElement(trip.start_time)} -
    ${utils.getTimeElement(trip.end_time)}
  </div>
  <div class="club-tag">${trip.club}</div>
  <p>${trip.description.substring(0, 190)}...</p>
</div>`
    })
    .join('')
  res.send(cards).status(200)
}
