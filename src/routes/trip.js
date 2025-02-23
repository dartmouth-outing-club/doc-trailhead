/* If you're looking for the method to create a trip, that's in /rest/trip.js */
import * as utils from '../utils.js'
import * as tripCard from './trip/trip-card.js'
import * as emails from '../emails.js'
import * as mailer from '../services/mailer.js'
import { BadRequestError } from '../request/errors.js'

function getClubs(db, userId, isOpo) {
  if (isOpo) {
    return db.all('SELECT id, name FROM clubs WHERE active = true')
  } else {
    // TODO *FINALLY* limit this to just active users
    return db.all(`
      SELECT clubs.id, clubs.name
      FROM club_leaders
      LEFT JOIN clubs ON clubs.id = club_leaders.club
      WHERE user = ? AND is_approved = 1
      ORDER BY name
      `, userId)
  }
}

export function getSignupView(req, res) {
  const tripId = req.params.tripId
  const isValidTrip = req.db.get('SELECT 1 as is_valid FROM trips WHERE id = ?', tripId)
  if (!isValidTrip) return res.render('views/missing-trip.njk')
  tripCard.renderSignupPage(req, res, tripId, req.user)
}

export function getLeaderView(req, res) {
  const tripId = req.params.tripId
  const isValidTrip = req.db.get('SELECT 1 as is_valid FROM trips WHERE id = ?', tripId)
  if (!isValidTrip) return res.render('views/missing-trip.njk')

  // Leader view is available only if the user is the leader of that trip or on OPO
  const is_opo = req.db.isOpo(req.user)
  const is_leader = req.db.isLeaderForTrip(tripId, req.user)
  return is_opo || is_leader
    ? tripCard.renderLeaderPage(req, res, tripId, req.user)
    : res.sendStatus(403)
}

export function getCreateView(req, res) {
  const emails = req.db.all('SELECT id, email FROM users WHERE email IS NOT NULL')
  const clubs = getClubs(req.db, req.user, res.locals.is_opo)
  const today = utils.getDatetimeValueForNow()
  res.render('views/create-trip.njk', { clubs, emails, today })
}

export function getEditView(req, res) {
  const tripId = req.params.tripId
  const template = req.url.includes('/template');
  if (!req.db.isOpoOrLeaderForTrip(tripId, req.user)) return res.sendStatus(401)

  const emails = req.db.all('SELECT id, email FROM users WHERE email IS NOT NULL')

  const trip = req.db.get(`
    SELECT id, title, club, cost, coleader_can_edit, experience_needed, private, start_time,
    end_time, location, pickup, dropoff, description, plan
    FROM trips
    WHERE id = ?
  `, tripId)

  let clubs = getClubs(req.db, req.user, res.locals.is_opo)

  // Add the current club to the list of clubs (if it's not already there)
  const tripClub = req.db.get('SELECT id, name FROM clubs WHERE id = ?', trip.club)

  if (tripClub && !clubs.some(club => club.id === tripClub.id)) {
    clubs = [...clubs, tripClub]
  }

  trip.leaders = req.db.all(`
    SELECT name
    FROM trip_members
    LEFT JOIN users on trip_members.user = users.id
    WHERE trip = ? AND leader = TRUE
  `, tripId)
    .map(item => item.name)
    .join(', ')

  trip.start_time = utils.getDatetimeValueForUnixTime(trip.start_time)
  trip.end_time = utils.getDatetimeValueForUnixTime(trip.end_time)
  
  res.render('views/edit-trip.njk', { clubs, emails, trip, template })
}

export function getUserView(req, res) {
  const { tripId, userId } = req.params
  const user = req.db.get('SELECT name FROM users WHERE id = ?', userId)
  return res.render('views/user.njk', { user_id: userId, trip_id: tripId, user_name: user.name })
}

export function createTrip(req, res) {
  if (!canCreateTripForClub(req.db, req.user, req.body.club)) {
    console.warn(`User ${req.user} tried to create a trip for ${req.body.club}, which they cannot.`)
    return res.sendStatus(403)
  }

  const trip = convertFormInputToDbInput(req.body, req.user)

  const info = req.db.run(`
    INSERT INTO trips (
      title, cost, owner, club, experience_needed, private, start_time, end_time,
      location, pickup, dropoff, description, plan)
    VALUES (
      @title, @cost, @owner, @club, @experience_needed, @private, @start_time,
      @end_time, @location, @pickup, @dropoff, @description, @plan
    )
  `, trip)

  const tripId = info.lastInsertRowid
  const leaders = [trip.owner, ...getLeaderIds(req)]
  const tripMembers = leaders.map(userId => [tripId, userId, 1, 0])
  req.db.runMany(
    'INSERT OR IGNORE INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)',
    tripMembers
  )

  mailer.send(emails.getNewTripEmail, req.db, tripId)

  const redirectUrl = req.body.goto_requests === 'on'
    ? `/trip/${tripId}/requests`
    : `/leader/trip/${tripId}`
  res.redirect(redirectUrl)
}

export function editTrip(req, res) {
  const tripId = req.params.tripId
  if (!req.db.isOpoOrLeaderForTrip(tripId, req.user)) return res.sendStatus(401)

  // TODO verify that user is OPO orleader for club. Not a security priority, just nice to have
  const trip = convertFormInputToDbInput(req.body, req.user)
  trip.id = tripId
  req.db.run(`
    UPDATE trips
    SET
      title = @title, club = @club, cost = @cost, start_time = @start_time, end_time = @end_time,
      location = @location, experience_needed = @experience_needed, private = @private,
      pickup = @pickup, dropoff = @dropoff, description = @description, plan = @plan
    WHERE id = @id
  `, trip)

  // Add new leaders
  const leaders = getLeaderIds(req)
  const values = leaders.map(userId => [tripId, userId, 1, 0])
  req.db.runMany(
    'INSERT OR IGNORE INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)',
    values
  )

  res.set('HX-Redirect', `/leader/trip/${tripId}`)
  return res.sendStatus(200)
}

export function deleteTrip(req, res) {
  const tripId = req.params.tripId
  if (!tripId || tripId < 1) return res.sendStatus(400)

  const trip = req.db.get('SELECT id, title, returned, start_time FROM trips WHERE id = ?', tripId)
  console.log(trip)

  if (trip.returned) {
    throw new BadRequestError('Cannot delete trips that have already returned')
  }
  if (utils.hasTimePassed(trip.start_time)) {
    throw new BadRequestError('Cannot delete trips that have already started')
  }

  trip.requestedGear = req.db.all(`
    SELECT name, count(gear) as quantity
    FROM member_gear_requests AS mrg
    LEFT JOIN trip_required_gear AS trg ON trg.id = mrg.gear
    WHERE mrg.trip = ?
    GROUP BY gear
    UNION
    SELECT name, quantity
    FROM group_gear_requests
    WHERE trip = ?
    `, tripId, tripId)

  const tripDeleteEmail = emails.getTripDeletedEmail(req.db, tripId)

  req.db.run('DELETE FROM trips WHERE id = ?', tripId)
  mailer.sendBuiltEmail(tripDeleteEmail)
  if (trip.requestedGear.length > 0) {
    mailer.sendBuiltEmail(emails.getTripDeletedGearUpdateEmail(trip))
  }

  res.set('HX-Redirect', '/my-trips')
  return res.sendStatus(200)
}

export function getSearchView(_req, res) {
  res.render('views/trip/search.njk')
}

export function postSearch(req, res) {
  const showPrivate = res.locals.is_opo

  const title = req.body.title
  if (!title?.length || title.length < 1) {
    return res.send('<div id=search-results class=notice>Results will display here</div>')
  }
  const searchTerm = `%${title}%`
  const results = req.db.all(`
    SELECT trips.id, title, users.name as owner, location, start_time, end_time, description,
      clubs.name as club
    FROM trips
    LEFT JOIN users on trips.owner = users.id
    LEFT JOIN clubs on trips.club = clubs.id
    WHERE title LIKE ?
      ${showPrivate ? '' : 'AND private = 0'}
    ORDER BY start_time DESC
  `, searchTerm)

  if (results.length > 100) {
    return res.send('<div id=title-results class=notice>Too many results, keep typing to narrow them</div>')
  }

  const trips = results.map(utils.formatForTripForTables)
  return res.render('views/trip/search/results-table.njk', { trips })
}

function canCreateTripForClub(db, userId, clubId) {
  if (db.isOpo(userId)) return true

  const userClubs = db
    .all('SELECT club FROM club_leaders WHERE user = ?', userId)
    .map(item => item.club)

  if (clubId === 0 || userClubs.length > 0) return true // Any leader can create a "none" trip
  if (userClubs.includes(clubId)) return true
  return false
}

/** Validate and convert the input to a database-ready function */
function convertFormInputToDbInput(input, userId) {
  if (!input.title) throw new BadRequestError('missing title')
  if (!input.start_time) throw new BadRequestError('missing start time')
  if (!input.end_time) throw new BadRequestError('missing end time')

  try {
    const club = input.club > 0 ? input.club : null
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
      experience_needed,
      private: is_private,
      start_time,
      end_time,
      location: input.location,
      pickup: input.pickup,
      dropoff: input.dropoff,
      description: input.description,
      plan: input.plan
    }
  } catch {
    console.warn('Malformed request to create trip, unable to parse body')
    console.warn(input)
    throw new BadRequestError('Sorry, that is not a valid trip')
  }
}

/*
 * Parse the input body and return and array of new leaders to add.
 * Guaranteed to return an array.
 */
function getLeaderIds(req) {
  const input = req.body
  const leaders = typeof input.leader === 'string' ? [input.leader] : input.leader
  const emails = leaders || []
  const ids = emails
    .map(email => req.db.get('SELECT id FROM users WHERE email = ?', email))
    .map(item => item?.id)
  return ids
}
