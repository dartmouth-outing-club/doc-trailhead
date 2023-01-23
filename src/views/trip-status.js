import * as sqlite from '../services/sqlite.js'

export function renderAttendanceTable (res, tripId) {
  const data = getAttendanceData(tripId)
  res.render('trip/attendance-table.njs', data)
}

export function getCheckOutView (req, res) {
  const data = getAttendanceData(req.params.tripId)
  console.log(data)
  res.render('views/trip-check-out.njs', data)
}

export function getCheckInView (req, res) {
  const tripId = req.params.tripId
  const trip = sqlite.get(`
    SELECT
      id as trip_id,
      title,
      left as checked_out,
      returned as checked_in
    FROM trips
    WHERE id = ?
  `, tripId)
  res.render('views/trip-check-in.njs', trip)
}

function getAttendanceData (tripId) {
  const trip = sqlite.get(`
    SELECT id AS trip_id, title, left AS checked_out, start_time
    FROM trips
    WHERE id = ?
  `, tripId)
  const members = sqlite.all(`
    SELECT trips.title, users.id, users.name, attended, trips.left
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND pending = 0
    ORDER BY users.name
  `, tripId)

  return { ...trip, members }
}