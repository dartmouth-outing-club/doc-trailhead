/* If you're looking for the method to create a trip, that's in /rest/trip.js */
import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'

function getClubs (userId, isOpo) {
  if (isOpo) {
    return sqlite.all('SELECT id, name FROM clubs WHERE active = true')
  } else {
    // TODO *FINALLY* limit this to just active users
    return sqlite.all(`
      SELECT clubs.id, clubs.name
      FROM club_leaders
      LEFT JOIN clubs ON clubs.id = club_leaders.club
      WHERE user = ? AND is_approved = 1
      ORDER BY name
      `, userId)
  }
}

export function getCreateView (req, res) {
  const emails = sqlite.all('SELECT id, email FROM users WHERE email IS NOT NULL')
  const clubs = getClubs(req.user, res.locals.is_opo)
  const today = utils.getDatetimeValueForNow()
  res.render('views/create-trip.njs', { clubs, emails, today })
}

export function getEditView (req, res) {
  const tripId = req.params.tripId
  if (!sqlite.isOpoOrLeaderForTrip(tripId, req.user)) return res.sendStatus(401)

  const emails = sqlite.all('SELECT id, email FROM users WHERE email IS NOT NULL')
  const clubs = getClubs(req.user, res.locals.is_opo)

  const trip = sqlite.get(`
    SELECT id, title, club, cost, coleader_can_edit, experience_needed, private, start_time,
    end_time, location, pickup, dropoff, description
    FROM trips
    WHERE id = ?
  `, tripId)

  trip.start_time = utils.getDatetimeValueForUnixTime(trip.start_time)
  trip.end_time = utils.getDatetimeValueForUnixTime(trip.end_time)
  res.render('views/edit-trip.njs', { clubs, emails, trip })
}
