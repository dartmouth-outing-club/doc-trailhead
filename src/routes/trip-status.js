import * as emails from '../emails.js'
import * as mailer from '../services/mailer.js'
import * as tripStatusView from '../routes/trip-status.js'

export function renderAttendanceTable (req, res, tripId) {
  const data = getAttendanceData(req, tripId)
  res.render('trip/attendance-table.njk', data)
}

export function getCheckOutView (req, res) {
  const data = getAttendanceData(req, req.params.tripId)
  console.log(data)
  res.render('views/trip-check-out.njk', data)
}

export function getCheckInView (req, res) {
  const tripId = req.params.tripId
  const trip = req.db.get(`
    SELECT
      id as trip_id,
      title,
      left as checked_out,
      returned as checked_in
    FROM trips
    WHERE id = ?
  `, tripId)
  res.render('views/trip-check-in.njk', trip)
}

function getAttendanceData (req, tripId) {
  const trip = req.db.get(`
    SELECT id AS trip_id, title, left AS checked_out, start_time
    FROM trips
    WHERE id = ?
  `, tripId)
  const members = req.db.all(`
    SELECT trips.title, users.id, users.name, attended, trips.left
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND pending = 0
    ORDER BY users.name
  `, tripId)

  return { ...trip, members }
}

export function checkOut (req, res) {
  const tripId = req.params.tripId
  req.db.run('UPDATE trips SET left = TRUE WHERE id = ?', tripId)
  res.set('HX-Redirect', `/trip/${tripId}/check-out`)
  res.sendStatus(200)
}

export function deleteCheckOut (req, res) {
  const tripId = req.params.tripId

  const trip = req.db.get('SELECT returned FROM trips WHERE id = ?', tripId)
  if (trip.returned) {
    console.warn(`User ${req.user} attempted to delete checkout from trip that has returend`)
    return res.sendStatus(400)
  }

  req.db.run('UPDATE trips SET left = FALSE WHERE id = ?', tripId)
  res.set('HX-Redirect', `/trip/${tripId}/check-out`)
  res.sendStatus(200)
}

export function checkIn (req, res) {
  const tripId = req.params.tripId
  req.db.run('UPDATE trips SET returned = TRUE WHERE id = ?', tripId)

  const trip = req.db.get('SELECT marked_late FROM trips WHERE id = ?', tripId)
  if (trip.marked_late) mailer.send(emails.getLateTripBackAnnouncement, req.db, tripId, true)

  res.set('HX-Redirect', `/trip/${tripId}/check-in`)
  res.sendStatus(200)
}

export function deleteCheckIn (req, res) {
  const tripId = req.params.tripId
  req.db.run('UPDATE trips SET returned = FALSE WHERE id = ?', tripId)

  const trip = req.db.get('SELECT marked_late FROM trips WHERE id = ?', tripId)
  if (trip.marked_late) mailer.send(emails.getLateTripBackAnnouncement, req.db, tripId, false)

  res.set('HX-Redirect', `/trip/${tripId}/check-in`)
  res.sendStatus(200)
}

export function markUserPresent (req, res) {
  const { tripId, memberId } = req.params
  const info = req.db.run(`
    UPDATE trip_members
    SET attended = TRUE
    WHERE trip = ? AND user = ? AND pending = 0
  `, tripId, memberId)

  if (info.changes !== 1) {
    console.error(`Attempted to mark member ${memberId} present on trip ${tripId}`)
    console.error('Unexpected number of changes based on request: ', info.changes)
  }

  tripStatusView.renderAttendanceTable(req, res, tripId)
}

export function markUserAbsent (req, res) {
  const { tripId, memberId } = req.params
  const info = req.db.run(`
    UPDATE trip_members
    SET attended = FALSE
    WHERE trip = ? AND user = ? AND pending = 0
  `, tripId, memberId)

  if (info.changes !== 1) {
    console.error(`Attempted to mark member ${memberId} present on trip ${tripId}`)
    console.error('Unexpected number of changes based on request: ', info.changes)
  }
  tripStatusView.renderAttendanceTable(req, res, tripId)
}
