import * as sqlite from '../services/sqlite.js'
import { escapeProperties } from '../templates.js'

function getIcon (clubName) {
  switch (clubName) {
    case 'OPO':
      return '/icons/opo.jpg'
    case 'Cabin and Trail':
      return '/icons/cnt.png'
    case 'Women in the Wilderness':
      return '/icons/wiw.png'
    case 'Surf Club':
      return '/icons/surf.png'
    case 'Mountain Biking':
      return '/icons/dmbc.png'
    case 'Winter Sports':
      return '/icons/wsc.png'
    case 'Timber Team':
      return '/icons/wood.png'
    case 'Mountaineering':
      return '/icons/mountain.png'
    case 'Ledyard':
      return '/icons/ledyard.png'
    case 'People of Color Outdoors':
      return '/icons/poco.png'
    case 'Bait and Bullet':
      return '/icons/bnb.png'
    default:
      return '/icons/doc.png'
  }
}

function getTimeElement (unixTime) {
  const date = new Date(unixTime)
  const minutes = date.getMinutes()
  const dateString = `${date.getMonth() + 1}/${date.getDate()}`
  const timeString = `${date.getHours()}:${minutes < 10 ? '0' + minutes : minutes}`
  return `<time datetime="${date.toISOString()}">${dateString} ${timeString}</time>`
}

export function get (_req, res) {
  const now = new Date()
  const publicTrips = sqlite.getDb().prepare(`
    SELECT title, location, start_time, end_time, clubs.name as club
    FROM trips
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE start_time > ? AND private = 0
    ORDER BY start_time ASC
    LIMIT 5
  `).all(now.getTime())

  const cards = publicTrips
    .map(escapeProperties)
    .map(trip => ({ ...trip, iconPath: getIcon(trip.club) }))
    .map(trip => `
<div class=trip-card>
  <img src="${trip.iconPath}">
  <h2>${trip.title}</h2>
  <hr/>
  <div>
    <h3>${trip.location}</h3>
    <p>
    ${getTimeElement(trip.start_time)} -
    ${getTimeElement(trip.end_time)}
    </p>
  </div>
</div>
`).join('')
  res.send(cards).status(200)
}
