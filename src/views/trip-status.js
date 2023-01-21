import * as sqlite from '../services/sqlite.js'

export function renderAttendanceTable (res, tripId) {
  const data = getAttendanceData(tripId)
  res.render('trip/attendance-table.njs', data)
}

export function getCheckOutView (req, res) {
  const data = getAttendanceData(req.params.tripId)
  res.render('views/trip-check-out.njs', data)
}

export function getCheckInView (req, res) {

}

function getAttendanceData (tripId) {
  const members = sqlite.all(`
    SELECT users.id, users.name, attended, trips.left
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND pending = 0
    ORDER BY users.name
  `, tripId)
  const checked_out = members[0]?.left || false
  return { trip_id: tripId, checked_out, members }
}
