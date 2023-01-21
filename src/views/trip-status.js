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
    SELECT users.id, users.name, attended
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    WHERE trip = ? AND pending = 0
  `, tripId)
  return { trip_id: tripId, members }
}
