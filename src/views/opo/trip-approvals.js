import * as utils from '../../utils.js'
import * as sqlite from '../../services/sqlite.js'

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

export function get (_req, res) {
  const now = new Date()
  const pastTimeWindow = new Date(now.getTime() - _30_DAYS_IN_MS)

  const past_trips = sqlite.all(
    `${OPO_TRIPS_QUERY}
    WHERE start_time > @low_time
      AND start_time < @high_time
      AND (gg_status != 'N/A' OR pc_status != 'N/A' OR vr_status != 'N/A')
    ORDER BY start_time DESC`,
    { low_time: pastTimeWindow.getTime(), high_time: now.getTime() }
  ).map(convertToRow)

  const future_trips = sqlite.all(
    `${OPO_TRIPS_QUERY}
    WHERE start_time > ? AND (gg_status != 'N/A' OR pc_status != 'N/A' OR vr_status != 'N/A')
    ORDER BY start_time ASC`,
    now.getTime()
  ).map(convertToRow)

  res.render('views/opo/trip-approvals.njk', { past_trips, future_trips })
}

function convertToRow (trip) {
  return {
    id: trip.id,
    title: trip.title,
    club: trip.club,
    owner: trip.owner,
    start_time_element: utils.getDatetimeElement(trip.start_time),
    gg_status_element: utils.getBadgeImgElement(trip.gg_status),
    vr_status_element: utils.getBadgeImgElement(trip.vr_status),
    pc_status_element: utils.getBadgeImgElement(trip.pc_status)
  }
}
