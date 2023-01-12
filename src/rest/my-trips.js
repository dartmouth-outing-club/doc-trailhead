import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'
import { getClubIcon } from '../utils.js'

export function get (req, res) {
  const userId = req.user
  const now = new Date()

  const publicTrips = sqlite.all(`
    SELECT trips.id, title, location, start_time, end_time, description, clubs.name as club
    FROM trip_members
    LEFT JOIN trips ON trips.id = trip_members.trip
    LEFT JOIN clubs ON trips.club = clubs.id
    WHERE trip_members.user = ? AND end_time > ?
    ORDER BY start_time ASC
    LIMIT 5
  `, userId, now.getTime())

  const cards = publicTrips
    .map(trip => ({ ...trip, iconPath: getClubIcon(trip.club) }))
    .map(trip => {
      const title = trip.title.length < 38 ? trip.title : trip.title.substring(0, 38) + '...'
      return `
<a href=/trip/${trip.id} class=trip-card>
  <img src="${trip.iconPath}">
  <header>Trip #${trip.id}</header>
  <h2>${title}</h2>
  <div>
    ${utils.getShortTimeElement(trip.start_time)} -
    ${utils.getShortTimeElement(trip.end_time)}
  </div>
  <div class="club-tag">${trip.club}</div>
  <p>${trip.description.substring(0, 190)}...</p>
</a>`
    })
    .join('')
  res.send(cards).status(200)
}
