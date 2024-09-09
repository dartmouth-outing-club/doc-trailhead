import { getAttendanceData } from './present.js'

export function get (req, res) {
  const data = getAttendanceData(req, req.params.tripId)
  res.render('views/trip-check-out.njk', data)
}

export function put (req, res) {
  const tripId = req.params.tripId
  req.db.run('UPDATE trips SET left = TRUE WHERE id = ?', tripId)
  res.set('HX-Refresh', 'true')
  res.sendStatus(200)
}

export function del (req, res) {
  const tripId = req.params.tripId

  const trip = req.db.get('SELECT returned FROM trips WHERE id = ?', tripId)
  if (trip.returned) {
    console.warn(`User ${req.user} attempted to delete checkout from trip that has returend`)
    return res.sendStatus(400)
  }

  req.db.run('UPDATE trips SET left = FALSE WHERE id = ?', tripId)
  res.set('HX-Refresh', 'true')
  res.sendStatus(200)
}

