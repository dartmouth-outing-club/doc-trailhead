import * as sqlite from '../services/sqlite.js'
import * as tripCard from './trip-card.js'

function canCreateTripForClub (userId, clubId) {
  if (sqlite.isOpo(userId)) return true

  const userClubs = sqlite
    .get('SELECT club FROM club_leaders WHERE user = ?', userId)
    .map(item => item.club)

  if (clubId === 0 && userClubs.length > 0) return true // Any leader can create a "none" trip
  if (userClubs.includes(clubId)) return true
  return false
}

export function getSignupView (req, res) {
  const tripId = req.params.id
  const isValidTrip = sqlite.get('SELECT 1 as is_valid FROM trips WHERE id = ?', tripId)
  if (!isValidTrip) return res.render('views/missing-trip.njs')

  // No point in showing trip leaders the "regular" view of their trip
  if (sqlite.isLeaderForTrip(tripId, req.user)) return res.redirect(`/leader/trip/${tripId}`)
  tripCard.renderSignupPage(res, tripId, req.user)
}

export function getLeaderView (req, res) {
  const tripId = req.params.id
  const isValidTrip = sqlite.get('SELECT 1 as is_valid FROM trips WHERE id = ?', tripId)
  if (!isValidTrip) return res.render('views/missing-trip.njs')
  console.log(isValidTrip)

  // Leader view is available only if the user is the leader of that trip or on OPO
  const is_opo = sqlite.isOpo(req.user)
  const is_leader = sqlite.isLeaderForTrip(tripId, req.user)
  return is_opo || is_leader
    ? tripCard.renderLeaderPage(res, tripId, req.user)
    : res.sendStatus(403)
}

export function createTrip (req, res) {
  if (!canCreateTripForClub(req.user, req.body.club)) {
    console.warn(`User ${req.user} tried to create a trip for ${req.body.club}, which they cannot.`)
    return res.sendStatus(403)
  }

  let trip
  try {
    trip = {
      title: req.body.title,
      cost: req.body.cost,
      owner: req.user,
      club: req.body.club,
      coleader_can_edit: req.body.edit_access === 'on' ? 1 : 0,
      experience_needed: req.body.experience_needed === 'on' ? 1 : 0,
      private: req.body.is_private === 'on' ? 1 : 0,
      // Eventually, when JS gets better date handling, this should probably be replaced
      start_time: (new Date(req.body.start_time)).getTime(),
      end_time: (new Date(req.body.end_time)).getTime(),
      location: req.body.location,
      pickup: req.body.pickup,
      dropoff: req.body.dropoff,
      description: req.body.description
    }
  } catch {
    console.warn('Malformed request to create trip, unable to parse body')
    console.warn(req.body)
    return res.sendStatus(400)
  }

  console.log(trip)
  const info = sqlite.run(`
    INSERT INTO trips (
      title, cost, owner, club, coleader_can_edit, experience_needed, private, start_time, end_time,
      location, pickup, dropoff, description)
    VALUES (
      @title, @cost, @owner, @club, @coleader_can_edit, @experience_needed, @private, @start_time,
      @end_time, @location, @pickup, @dropoff, @description
    )
  `, trip)

  const tripId = info.lastInsertRowid
  const leaders = [trip.owner] // TODO add other leaders
  const values = leaders.map(userId => `(${tripId},${userId}, 1, 0)`).join(', ')
  sqlite
    .run(`INSERT INTO trip_members (trip, user, leader, pending) VALUES ${values}`, tripId, values)

  res.redirect(`/trip/${tripId}`)
}

export function deleteTrip (req, res) {
  const tripId = req.params.tripId
  if (!tripId || tripId < 1) return res.sendStatus(400)

  const tripOwner = sqlite.get('SELECT owner FROM trips WHERE id = ?', tripId)
  if (tripOwner !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  sqlite.run('DELETE FROM trips WHERE id = ?', tripId)
  return res.redirect(303, '/my-trips')
}
