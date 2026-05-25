import * as utils from '../../utils.js'

const _60_DAYS_IN_MS = 5184000000

const CLUB_CHAIR_TRIPS_QUERY = `
    SELECT 
      trips.id,
      title,
      clubs.id as clubid, 
      clubs.name as clubname, 
      location,
      start_time,
      users.name as owner,
      group_gear_approved,
      iif(vr.id IS NULL,
        'N/A',
        iif(vr.is_approved IS NULL, 'pending', iif(vr.is_approved = 0, 'denied', 'approved'))
      ) AS vr_status,
      iif(pc.rowid IS NULL,
        'N/A',
        iif(pc.is_approved IS NULL, 'pending', iif(pc.is_approved = 0, 'denied', 'approved'))
      ) AS pc_status,
    iif(trips.member_gear_approved IS NULL,
      iif(mg.count IS NULL, 'N/A', 'pending'),
      iif(trips.member_gear_approved = 1, 'approved', 'denied')) as mg_status,
    iif(trips.group_gear_approved IS NULL,
      iif(gg.count IS NULL, 'N/A', 'pending'),
      iif(trips.group_gear_approved = 1, 'approved', 'denied')) as gg_status
    FROM trips
    JOIN clubs on clubs.id = trips.club
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN trip_pcard_requests AS pc ON pc.trip = trips.id
    LEFT JOIN vehiclerequests AS vr ON vr.trip = trips.id
    LEFT JOIN (SELECT trip, count(*) as count FROM member_gear_requests GROUP BY trip) AS mg
      ON mg.trip = trips.id
    LEFT JOIN (SELECT trip, count(*) as count FROM group_gear_requests GROUP BY trip) AS gg
      ON gg.trip = trips.id
`

export function get(req, res) {
  const now = new Date()
  const pastTimeWindow = new Date(now.getTime() - _60_DAYS_IN_MS)

  const userId = parseInt(req.user)

  const userChairIn = req.db.all(`
    SELECT 
        clubs.id,
        clubs.name
    FROM club_chairs
    LEFT JOIN clubs ON clubs.id = club_chairs.club
    WHERE user = ? AND is_approved = 1
    ORDER BY name
  `, userId)

  // TODO: if users are chair in multiple clubs, ideally let them filter which to see
  const clubIds = userChairIn.map(({ id }) => id)
  const club_names = userChairIn.map(({ name }) => name)

  const past_trips = req.db.all(
    `${CLUB_CHAIR_TRIPS_QUERY}
    WHERE start_time > @low_time
      AND start_time < @high_time
      AND clubid in (${clubIds.join(',')})
    ORDER BY start_time DESC`,
    { low_time: pastTimeWindow.getTime(), high_time: now.getTime() }
  ).map(convertToRow)

  const future_trips = req.db.all(
    `${CLUB_CHAIR_TRIPS_QUERY}
    WHERE start_time > ?
      AND clubid in (${clubIds.join(',')})
    ORDER BY start_time ASC`,
    now.getTime()
  ).map(convertToRow)

  res.render('views/chair/trip-overview.njk', { club_names, past_trips, future_trips })
}

function convertToRow(trip) {
  return {
    id: trip.id,
    title: trip.title,
    clubname: trip.clubname,
    owner: trip.owner,
    start_time_element: utils.getDatetimeElement(trip.start_time),
    mg_status_element: utils.getBadgeImgElement(trip.mg_status),
    gg_status_element: utils.getBadgeImgElement(trip.gg_status),
    vr_status_element: utils.getBadgeImgElement(trip.vr_status),
    pc_status_element: utils.getBadgeImgElement(trip.pc_status)
  }
}
