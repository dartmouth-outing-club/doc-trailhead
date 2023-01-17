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

function convertFormInputToDbInput (input, userId) {
  try {
    const club = input.club > 0 ? input.club : null
    const coleader_can_edit = input.edit_access === 'on' ? 1 : 0
    const experience_needed = input.experience_needed === 'on' ? 1 : 0
    const is_private = input.is_private === 'on' ? 1 : 0
    // Eventually, when JS gets better date handling, this should probably be replaced
    const start_time = (new Date(input.start_time)).getTime()
    const end_time = (new Date(input.end_time)).getTime()
    return {
      title: input.title,
      cost: input.cost,
      owner: userId,
      club,
      coleader_can_edit,
      experience_needed,
      private: is_private,
      start_time,
      end_time,
      location: input.location,
      pickup: input.pickup,
      dropoff: input.dropoff,
      description: input.description
    }
  } catch {
    console.warn('Malformed request to create trip, unable to parse body')
    console.warn(input)
  }
}

export function getSignupView (req, res) {
  const tripId = req.params.tripId
  const isValidTrip = sqlite.get('SELECT 1 as is_valid FROM trips WHERE id = ?', tripId)
  if (!isValidTrip) return res.render('views/missing-trip.njs')

  // No point in showing trip leaders the "regular" view of their trip
  if (sqlite.isLeaderForTrip(tripId, req.user)) return res.redirect(`/leader/trip/${tripId}`)
  tripCard.renderSignupPage(res, tripId, req.user)
}

export function getLeaderView (req, res) {
  const tripId = req.params.tripId
  const isValidTrip = sqlite.get('SELECT 1 as is_valid FROM trips WHERE id = ?', tripId)
  if (!isValidTrip) return res.render('views/missing-trip.njs')

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

  const trip = convertFormInputToDbInput(req.body, req.user)
  if (!trip) return res.sendStatus(400)

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
  const values = leaders.map(userId => [tripId, userId, 1, 0])
  sqlite
    .runMany('INSERT INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)', values)

  res.redirect(`/trip/${tripId}`)
}

export function editTrip (req, res) {
  const tripId = req.params.tripId
  if (!sqlite.isOpoOrLeaderForTrip(tripId, req.user)) return res.sendStatus(401)

  // TODO verify that user is OPO orleader for club. Not a security priority, just nice to have
  const trip = convertFormInputToDbInput(req.body, req.user)
  trip.id = tripId
  sqlite.run(`
    UPDATE trips
    SET
      title = @title, club = @club, cost = @cost, start_time = @start_time, end_time = @end_time,
      location = @location, coleader_can_edit = @coleader_can_edit, experience_needed =
      @experience_needed, private = @private, pickup = @pickup, dropoff = @dropoff, description =
      @description
    WHERE id = @id
  `, trip)
  res.set('HX-Redirect', `/leader/trip/${tripId}`)
  return res.sendStatus(200)
}

export function deleteTrip (req, res) {
  const tripId = req.params.tripId
  if (!tripId || tripId < 1) return res.sendStatus(400)

  const tripOwner = sqlite.get('SELECT owner FROM trips WHERE id = ?', tripId)
  if (tripOwner !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  sqlite.run('DELETE FROM trips WHERE id = ?', tripId)
  res.set('HX-Redirect', '/my-trips')
  return res.sendStatus(200)
}
