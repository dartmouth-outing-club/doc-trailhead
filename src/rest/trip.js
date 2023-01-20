import * as sqlite from '../services/sqlite.js'
import * as mailer from '../services/mailer.js'

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
  const leaders = [trip.owner, ...getLeaderIds(req.body)]
  const values = leaders.map(userId => [tripId, userId, 1, 0])
  console.log(values)
  sqlite
    .runMany('INSERT INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)', values)

  const leaderEmails = sqlite.getTripLeaderEmails(tripId)
  mailer.sendNewTripEmail(tripId, trip.title, leaderEmails)
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

  // Add new leaders
  const leaders = getLeaderIds(req.body)
  console.log(leaders)
  const values = leaders.map(userId => [tripId, userId, 1, 0])
  sqlite
    .runMany('INSERT INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)', values)

  res.set('HX-Redirect', `/leader/trip/${tripId}`)
  return res.sendStatus(200)
}

export function deleteTrip (req, res) {
  const tripId = req.params.tripId
  if (!tripId || tripId < 1) return res.sendStatus(400)

  const trip = sqlite.getTripEmailInfo(tripId)
  sqlite.run('DELETE FROM trips WHERE id = ?', tripId)
  mailer.sendTripDeletedEmail(trip.id, trip.title, trip.owner_email, trip.member_emails)
  res.set('HX-Redirect', '/my-trips')
  return res.sendStatus(200)
}

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

/*
 * Parse the input body and return and array of new leaders to add.
 * Guaranteed to return an array.
 */
function getLeaderIds (input) {
  const leaders = typeof input.leader === 'string' ? [input.leader] : input.leader
  const emails = leaders || []
  const ids = emails
    .map(email => sqlite.get('SELECT id FROM users WHERE email = ?', email))
    .map(item => item.id)
  return ids
}
