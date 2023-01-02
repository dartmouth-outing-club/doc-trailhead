import * as constants from '../constants.js'
import * as sqlite from '../services/sqlite.js'
import { escapeProperties } from '../templates.js'
import { getBadgeImgElement } from '../utils.js'

const _30_DAYS_IN_MS = 2592000000
const OPO_TRIPS_QUERY = `
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
      ) AS pc_status,
    iif(trips.group_gear_approved IS NULL,
      iif(gg.count IS NULL, 'N/A', 'pending'),
      iif(trips.group_gear_approved = 1, 'approved', 'denied')) as gg_status
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs ON trips.club = clubs.id
    LEFT JOIN trip_pcard_requests AS pc ON pc.trip = trips.id
    LEFT JOIN vehiclerequests AS vr ON vr.trip = trips.id
    LEFT JOIN (SELECT trip, count(*) as count FROM group_gear_requests GROUP BY trip) AS gg
      ON gg.trip = trips.id
`

function convertTripsToTable (trips) {
  const rows = trips
    .map(escapeProperties)
    .map(trip => {
      return `
<tr>
<td>${trip.title}
<td>${constants.getTimeElement(trip.start_time)}
<td>${trip.club}
<td>${trip.owner}
<td>${getBadgeImgElement(trip.gg_status)}
<td>${getBadgeImgElement(trip.vr_status)}
<td>${getBadgeImgElement(trip.pc_status)}
</tr>
`
    }).join('')

  return rows
}

export function getTripsPendingApproval (req, res) {
  const now = new Date()
  let trips
  if (req.query.show_past === 'true') {
    const timeWindow = new Date(now.getTime() - _30_DAYS_IN_MS)
    // Show old trips that needed reviews (even if you didn't) and upcoming trips that were reviewed
    trips = sqlite.getDb().prepare(`
      ${OPO_TRIPS_QUERY}
      WHERE start_time > @low_time
       AND (
        (start_time < @high_time AND (gg_status != 'N/A' OR pc_status != 'N/A' OR vr_status != 'N/A')) OR
        (start_time > @high_time AND (gg_status != 'pending' AND pc_status != 'pending' AND vr_status != 'pending')))
      ORDER BY start_time DESC
    `).all({ low_time: timeWindow.getTime(), high_time: now.getTime() })
  } else {
    trips = sqlite.getDb().prepare(`
    ${OPO_TRIPS_QUERY}
    WHERE start_time > ?
    ORDER BY start_time ASC
  `).all(now.getTime())
  }

  const rows = convertTripsToTable(trips)
  res.send(rows).status(200)
}
