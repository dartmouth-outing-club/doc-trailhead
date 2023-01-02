import * as constants from '../constants.js'
import * as sqlite from '../services/sqlite.js'
import { escapeProperties } from '../templates.js'
import { getBadgeImgElement } from '../utils.js'

function getGroupGearRequestsBadge (tripId) {
  const group_gear_status = sqlite.getDb().prepare(`
    SELECT iif(group_gear_approved IS NULL,
               iif(count IS NULL, 'N/A', 'pending'),
               iif(group_gear_approved = 1, 'approved', 'denied')) as status
    FROM trips
    LEFT JOIN (
      SELECT trip, count(*) as count
      FROM group_gear_requests
      GROUP BY trip)
    ON trip = id where id = ?
    `).get(tripId)?.status
  return getBadgeImgElement(group_gear_status)
}

export function getTripsPendingApproval (req, res) {
  const now = new Date()
  const trips = sqlite.getDb().prepare(`
    SELECT trips.id,
      title,
      location,
      start_time,
      users.name as owner,
      clubs.name as club,
      group_gear_approved,
      iif(vr.id IS NULL,
        'N/A',
        iif(vr.is_approved IS NULL, 'pending', iif(vr.is_approved = 0, 'denied', 'approved'))
      ) AS vr_status,
      iif(pc.rowid IS NULL,
        'N/A',
        iif(pc.is_approved IS NULL, 'pending', iif(pc.is_approved = 0, 'denied', 'approved'))
      ) AS pc_status
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs ON trips.club = clubs.id
    LEFT JOIN trip_pcard_requests AS pc ON pc.trip = trips.id
    LEFT JOIN vehiclerequests AS vr ON vr.trip = trips.id
    WHERE start_time > ? AND private = 0
    ORDER BY start_time ASC
    LIMIT 5
  `).all(now.getTime())

  const rows = trips
    .map(escapeProperties)
    .map(trip => {
      return `
<tr>
<td>${trip.title}
<td>${constants.getTimeElement(trip.start_time)}
<td>${trip.club}
<td>${trip.owner}
<td>${getGroupGearRequestsBadge(trip.id)}
<td>${getBadgeImgElement(trip.vr_status)}
<td>${getBadgeImgElement(trip.pc_status)}
</tr>
`
    }).join('')

  res.send(rows).status(200)
}
