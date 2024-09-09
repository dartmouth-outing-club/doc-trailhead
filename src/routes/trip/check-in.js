import * as emails from '../../emails.js'
import * as mailer from '../../services/mailer.js'

export function get (req, res) {
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

export function put (req, res) {
  const tripId = req.params.tripId
  req.db.run('UPDATE trips SET returned = TRUE WHERE id = ?', tripId)

  const trip = req.db.get('SELECT marked_late FROM trips WHERE id = ?', tripId)
  if (trip.marked_late) mailer.send(emails.getLateTripBackAnnouncement, req.db, tripId, true)

  res.set('HX-Refresh', 'true')
  res.sendStatus(200)
}

export function del (req, res) {
  const tripId = req.params.tripId
  req.db.run('UPDATE trips SET returned = FALSE WHERE id = ?', tripId)

  const trip = req.db.get('SELECT marked_late FROM trips WHERE id = ?', tripId)
  if (trip.marked_late) mailer.send(emails.getLateTripBackAnnouncement, req.db, tripId, false)

  res.set('HX-Refresh', 'true')
  res.sendStatus(200)
}
