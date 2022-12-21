/**
 * Fetch data from SQLite and format it in a way the frontend expects.
 *
 * If you're looking at this file and thinking "geez why is so complicated" it's because the
 * frontend currently expects a deeply nested data structure. There's no inherent reason the
 * frontend has to do this; in fact many times the frontend does a lot of work to unpack the nested
 * data structure.
 *
 * I've opted to fix these problems on at a time: first by writing a backend that stores the data in
 * a simple structure and then makes it more complicated (that's this file) when it's fetched by the
 * frontend, followed writing a frontend that expects data in a simpler format (HTML) and writing
 * simple backend APIs for the SQL table that surface that data. Such are the delights and perils of
 * working with legacy code (i.e. basically all code).
 */
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { subtract } from 'date-arithmetic'

let db

export function start (name) {
  if (db !== undefined) throw new Error('ERROR: tried to start sqlite db that was already running')

  const dbName = name || ':memory:'
  db = new Database(dbName)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  console.log(`Starting sqlite database from file: ${getDatabaseFile()}`)
}

export const getDatabaseFile = () => db.pragma('database_list')[0].file

export function stop () {
  db.close()
  db = undefined
}

export function execFile (filePath) {
  const statements = fs.readFileSync(filePath).toString()
  return db.exec(statements)
}

function convertSqlDate (unixDate) {
  if (!unixDate) return undefined
  try {
    return (new Date(unixDate)).toISOString()
  } catch (error) {
    if (error instanceof SyntaxError) {
      return unixDate
    }
    throw error
  }
}

function getTimeField (unixDate) {
  if (!unixDate) return undefined
  try {
    const date = new Date(unixDate)
    const minutes = date.getMinutes()
    return `${date.getHours()}:${minutes < 10 ? '0' + minutes : minutes}`
  } catch (error) {
    if (error instanceof SyntaxError) {
      return unixDate
    }
    throw error
  }
}

/**
 * FORMAT FUNCTIONS
 * Format functions translate the new schema into the old structure the frontend expects
 */
function formatAssignment (assignment) {
  if (assignment === undefined) return undefined
  return {
    ...assignment,
    _id: assignment.id,
    assigned_vehicle: assignment.vehicle,
    assigned_pickupDateAndTime: assignment.pickup_time,
    assigned_returnDateAndTime: assignment.return_time,
    pickedUp: assignment.picked_up,
    responseIndex: 0
  }
}

function formatClub (club) {
  if (club === undefined) return undefined
  return { ...club, _id: club.id }
}

function formatVehicle (vehicle) {
  if (vehicle === undefined) return undefined
  return { ...vehicle, _id: vehicle.id }
}

function formatVehicleRequest (vehicleRequest) {
  if (vehicleRequest === undefined) return undefined
  return {
    ...vehicleRequest,
    _id: vehicleRequest.id,
    number: vehicleRequest.id,
    requestDetails: vehicleRequest.request_details,
    noOfPeople: vehicleRequest.num_participants,
    trip: vehicleRequest.associatedTrip,
    requestType: vehicleRequest.request_type
  }
}

function formatTrip (trip) {
  if (trip === undefined) return undefined

  return {
    ...trip,
    _id: trip.id,
    number: trip.id,
    markedLate: trip.marked_late,
    startDate: trip.start_time,
    endDate: trip.end_time,
    startDateAndTime: trip.start_time,
    endDateAndTime: trip.end_time,
    experienceNeeded: trip.experience_needed,
    coLeaderCanEditTrip: trip.coleader_can_edit,
    trippeeGearStatus: trip.trippee_gear_status,
    gearStatus: trip.gear_status,
    pcard: trip.pcard,
    pcardStatus: trip.pcard_status,
    vehicleStatus: trip.vehicle_status
  }
}

function formatRequestedVehicle (vehicle) {
  if (vehicle === undefined) return undefined
  const pickup_time = convertSqlDate(vehicle.pickup_time)
  const return_time = convertSqlDate(vehicle.return_time)
  return {
    vehicleType: vehicle.type,
    vehicleDetails: vehicle.details,
    pickupTime: pickup_time,
    returnTime: return_time,
    pickupDate: pickup_time,
    returnDate: return_time,
    pickupDateAndTime: pickup_time,
    returnDateAndTime: return_time,
    trailerNeeded: vehicle.trailer_needed,
    passNeeded: vehicle.pass_needed,
    recurringVehicle: vehicle.recurring_vehicle
  }
}

/*
 * DATABASE FUNCTIONS
 * Create, read, update, or delete from the database.
 */
function getClubName (id) {
  return db.prepare('SELECT name FROM clubs WHERE id = ?').get(id)
}

function getRequestedGearForUser (tripId, userId) {
  return db.prepare(`
    SELECT trip_gear.id, trip_gear.name
    FROM member_gear_requests
    LEFT JOIN trip_gear ON trip_gear.id = member_gear_requests.trip_gear
    WHERE trip_gear.trip = ? AND user = ?`
  ).all(tripId, userId)
    .map(request => ({ gearId: request.id, name: request.name }))
}

function getTripParticipants (tripId, ownerId) {
  const users = db.prepare(`
    SELECT users.id, users.email, users.name, pending, leader, attended, height, shoe_size,
      clothe_size
    FROM trip_members
    LEFT JOIN users ON trip_members.user = users.id
    WHERE trip_members.trip = ?
  `)
    .all(tripId)
    .map(user => {
      const frontendUser = {
        id: user.id,
        _id: user.id,
        email: user.email,
        name: user.name,
        height: user.height,
        shoe_size: user.shoe_size,
        clothe_size: user.clothe_size
      }
      return {
        attended: user.attended,
        user: frontendUser,
        requestedGear: getRequestedGearForUser(tripId, user.id),
        pending: user.pending,
        leader: user.leader
      }
    })

  const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(ownerId)
  const members = users.filter(user => user.pending === 0)
  const pending = users.filter(user => user.pending === 1)
  const leaders = users.filter(user => user.leader === 1).map(item => item.user)
  return { owner, leaders, members, pending }
}

function enhanceUser (user) {
  if (!user) return user

  const leader_for = db.prepare(`
  SELECT clubs.id, name
  FROM club_leaders
  LEFT JOIN clubs ON club = clubs.id
  WHERE user = ? AND is_approved = true
  `).all(user.id)

  const requested_clubs = db.prepare(`
  SELECT clubs.id, name
  FROM club_leaders
  LEFT JOIN clubs ON club = clubs.id
  WHERE user = ? AND is_approved = false
  `)

  const requested_certs = getRequestedCertsForUser(user.id)

  user._id = user.id
  user.casID = user.cas_id
  user.leader_for = leader_for
  user.requested_clubs = requested_clubs
  user.requested_certs = requested_certs
  user.has_pending_leader_change = requested_clubs.length !== 0
  user.has_pending_cert_change = requested_certs.length !== 0

  return user
}

export function getClubs () {
  const club = db.prepare('SELECT * FROM clubs').all()
  return formatClub(club)
}

export function insertClub (name) {
  const info = db
    .prepare('INSERT INTO clubs VALUES (name) VALUES (?)')
    .run(name)
  return info.lastInsertRowid
}

// Mimic the previous insertion tactic of using an array
export function replaceUsersClubs (userId, approvedClubs, requestedClubs) {
  db.prepare('DELETE FROM club_leaders WHERE user = ?').run(userId)
  approvedClubs.forEach(club => {
    db.prepare('INSERT INTO club_leaders (user, club, is_approved) VALUES (?, ?, true)')
      .run(userId, club)
  })
  requestedClubs.forEach(club => {
    db.prepare('INSERT INTO club_leaders (user, club, is_approved) VALUES (?, ?, false)')
      .run(userId, club)
  })
}

export function denyLeadershipRequests (userId) {
  return db.prepare('DELETE FROM club_leaders WHERE user = ? AND is_approved = false').run(userId)
}

export function approveLeadershipRequests (userId) {
  const user = getUserById(userId)
  const role = user.role === 'OPO' ? 'OPO' : 'Leader'
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId)
  db.prepare('UPDATE club_leaders SET is_approved = true WHERE user = ?').run(userId)
}

export function getLeadersPendingApproval () {
  const pendingRequests = db.prepare(`
  SELECT user, club
  FROM club_leaders
  WHERE is_approved = false
  `).all()

  const clubRequestsByUser = pendingRequests.reduce((accum, request) => {
    const { user, club } = request
    accum[user] = accum[user] ? [...accum[user], club] : [club]
    return accum
  }, {})
  const users = Object.keys(clubRequestsByUser)

  return users.map(userId => {
    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId)
    user._id = user.id
    const requested_clubs = clubRequestsByUser[userId].map(clubId => {
      const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(clubId)
      return formatClub(club)
    })
    return { ...user, requested_clubs }
  })
}

function getRequestedCertsForUser (userId) {
  const statement = db.prepare(`
  SELECT id, user, name, '[' || group_concat(cert, ',') || ']' as certs
  FROM user_certs
  JOIN users on users.id = user
  WHERE
    is_approved = FALSE
    ${userId ? 'AND user = ?' : ''}
  GROUP BY user
  `)

  if (userId) {
    return statement.all(userId)
  } else {
    return statement.all()
  }
}

export function requestDriverCert (userId, cert) {
  if (cert !== 'VAN' || cert !== 'MICROBUS') throw new Error(`Invalid cert ${cert} provided`)
  db.prepare(`
  INSERT OR REPLACE into user_certs
    (user, cert, is_approved)
  VALUES (?, ?, false)
  `).run(userId, cert)
}

export function requestTrailerCert (userId) {
  db.prepare(`
  INSERT OR REPLACE into user_certs
    (user, cert, is_approved)
  VALUES (?, 'TRAILER', false)
  `).run(userId)
}

export function getUsersPendingCerts () {
  const users = getRequestedCertsForUser()
  return users.map(user => {
    const { id, name, certs } = user
    let driver_cert
    if (certs.includes('MICROBUS')) {
      driver_cert = 'MICROBUS'
    } else if (certs.includes('VAN')) {
      driver_cert = 'VAN'
    } else {
      driver_cert = null
    }
    const trailer_cert = certs.includes('TRAILER') ? 'true' : false
    const requested_certs = { driver_cert, trailer_cert }
    return { id, name, _id: id, requested_certs }
  })
}

export function denyUserRequestedCerts (userId) {
  db.prepare('DELETE FROM user_certs WHERE user = ? and is_approved = false').run(userId)
}

export function approveUserRequestedCerts (userId) {
  db.prepare('UPDATE user_certs SET is_approved = true WHERE user = ?').run(userId)
}

export function getUserById (id) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  return enhanceUser(user)
}

export function getUserByCasId (casId) {
  const user = db.prepare('SELECT * FROM users WHERE cas_id = ?').get(casId)
  return enhanceUser(user)
}

export function getUserByEmail (email) {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  return enhanceUser(user)
}

export function getListOfUsers () {
  const users = db.prepare('SELECT id, name, email FROM users').all()
  return users.map(user => ({ ...user, _id: user.id }))
}

export function insertUser (casId) {
  const info = db.prepare('INSERT INTO users (cas_id) VALUES (?)').run(casId)
  return info.lastInsertRowid
}

// ifnull() ensures we only update the fields that are on the object
export function updateUser (user) {
  const info = db.prepare(`
  UPDATE users
  SET
    email = ifnull(@email, email),
    name = ifnull(@name, name),
    photo_url = ifnull(@photo_url, photo_url),
    pronoun = ifnull(@pronoun, pronoun),
    dash_number = ifnull(@dash_number, dash_number),
    allergies_dietary_restrictions = ifnull(@allergies_dietary_restrictions, allergies_dietary_restrictions),
    medical_conditions = ifnull(@medical_conditions, medical_conditions),
    clothe_size = ifnull(@clothe_size, clothe_size),
    shoe_size = ifnull(@shoe_size, shoe_size),
    height = ifnull(@height, height),
    role = ifnull(@role, role)
  WHERE id = @id
  `).run(user)

  return info.changes
}

export function getVehicle (id) {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id)
  return formatVehicle(vehicle)
}

export function getVehicleByName (name) {
  const vehicle = db.prepare('SELECT * FROM vehicles WHERE name = ?').get(name)
  return formatVehicle(vehicle)
}

export function getActiveVehicles () {
  return db.prepare('SELECT * FROM vehicles WHERE active = true').all().map(formatVehicle)
}

export function insertVehicle (name, type) {
  const info = db
    .prepare('INSERT INTO vehicles VALUES (name, type) VALUES (?, ?)')
    .run(name, type)

  return info.lastInsertRowid
}

export function updateVehicle (id, name, type) {
  return db
    .prepare('UPDATE vehicles SET name = ?, type = ? WHERE id = ?')
    .run(name, type, id)
}

export function makeVehicleInactive (id) {
  const info = db.prepare('UPDATE vehicles SET active = false WHERE id = ?').run(id)
  return info.changes
}

function getVehiclesForVehicleRequest (requestId) {
  return db
    .prepare('SELECT * FROM requested_vehicles WHERE vehiclerequest = ?')
    .all(requestId)
    .map(({ pickup_time, return_time }) => ({
      pickupDateAndTime: pickup_time,
      returnDateAndTime: return_time
    }))
}

function insertRequestedVehicle (requestedVehicle) {
  return db.prepare(`
    INSERT INTO requested_vehicles
      (vehiclerequest, type, details, pickup_time, return_time, trailer_needed, pass_needed, recurring_vehicle)
    VALUES (@vehiclerequest, @type, @details, @pickup_time, @return_time, @trailer_needed, @pass_needed, @recurring_vehicle)
  `).run(requestedVehicle)
}

export function replaceRequestedVehicles (vehicleRequestId, requestedVehicles) {
  // Mimic the way this data used to be store (delete the old "array", add a new one)
  db.prepare('DELETE FROM requested_vehicles WHERE vehiclerequest = ?').run(vehicleRequestId)
  requestedVehicles.forEach(insertRequestedVehicle)
}

export function getVehicleRequestById (id) {
  const vehicleRequest = db.prepare('SELECT * FROM vehiclerequests WHERE id = ?').get(id)
  vehicleRequest.requestedVehicles = db
    .prepare('SELECT * FROM requested_vehicles WHERE vehiclerequest = ?')
    .all(id)
    .map(formatRequestedVehicle)
  return formatVehicleRequest(vehicleRequest)
}

export function getVehicleRequestByTripId (id) {
  const vehicleRequest = db.prepare('SELECT * FROM vehiclerequests WHERE trip = ?').get(id)
  vehicleRequest.requestedVehicles = db
    .prepare('SELECT * FROM requested_vehicles WHERE vehiclerequest = ?')
    .all(id)
    .map(formatRequestedVehicle)
  return formatVehicleRequest(vehicleRequest)
}

export function getVehicleRequestsByRequester (requester) {
  const vehicleRequest = db
    .prepare('SELECT * FROM vehiclerequests WHERE requester = ?')
    .get(requester)
  vehicleRequest.requestedVehicles = db
    .prepare('SELECT * FROM requested_vehicles WHERE vehiclerequest = ?')
    .all(vehicleRequest.id)
    .map(formatRequestedVehicle)
  return formatVehicleRequest(vehicleRequest)
}

export function insertVehicleRequest (vehicleRequest) {
  const info = db.prepare(`
  INSERT INTO vehiclerequests
    (requester, request_details, mileage, num_participants, trip, request_type)
  VALUES (@requester, @request_details, @mileage, @num_participants, @trip, @request_type)
  `).run(vehicleRequest)
  return info.lastInsertRowid
}

export function updateVehicleRequest (vehicleRequest) {
  const info = db.prepare(`
  UPDATE vehiclerequests
  SET
    requester = @requester,
    request_details = @request_details,
    mileage = @mileage,
    num_participants = @num_participants,
    trip = @trip,
    request_type = @request_type,
    status = @status
  WHERE id = @id
  `).run(vehicleRequest)
  return info.changes
}

export function markVehicleRequestApproved (id) {
  const info = db.prepare("UPDATE vehiclerequests SET status = 'approved' WHERE id = ?").run(id)
  return info.changes
}

export function markVehicleRequestDenied (id) {
  const info = db.prepare("UPDATE vehiclerequests SET status = 'denied' WHERE id = ?").run(id)
  return info.changes
}

export function deleteVehicleRequest (vehicleRequestId) {
  // Deletes assignments as well thanks to cascading
  const info = db.prepare('DELETE FROM vehiclerequests WHERE id = ?').run(vehicleRequestId)
  return info.changes
}

export function markTripVehicleStatusPending (id) {
  const info = db.prepare("UPDATE trips SET vehicle_status = 'denied' WHERE id = ?").run(id)
  return info.changes
}

export function markTripVehicleStatusDenied (id) {
  const info = db.prepare("UPDATE trips SET vehicle_status = 'denied' WHERE id = ?").run(id)
  return info.changes
}

export function markTripVehicleStatusApproved (id) {
  const info = db.prepare("UPDATE trips SET vehicle_status = 'approved' WHERE id = ?").run(id)
  return info.changes
}

export function markTripVehicleAssignmentsPickedUp (tripId) {
  const vehicleRequestId = getVehicleRequestByTripId(tripId)
  return db
    .prepare('UPDATE assignments SET picked_up = true WHERE vehiclerequest = ?')
    .run(vehicleRequestId)
}

export function markTripVehicleAssignmentsReturned (tripId) {
  const vehicleRequestId = getVehicleRequestByTripId(tripId)
  return db
    .prepare('UPDATE assignments SET returned = true WHERE vehiclerequest = ?')
    .run(vehicleRequestId)
}

export function markOldTripsAsPast () {
  const now = new Date()
  const yesterday = subtract(now, 1, 'day')
  db.prepare('UPDATE trips SET past = true WHERE start_time < ?').run(yesterday)
}

export function getAssignmentById (id) {
  const assignment = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id)
  return formatAssignment(assignment)
}

export function getAssignmentsForVehicleRequest (vehicleRequestId) {
  return db
    .prepare('SELECT * FROM assignments WHERE vehiclerequest = ?')
    .all(vehicleRequestId)
    .map(formatAssignment)
}

export function updateAssignment (assignment) {
  return db.prepare(`
  UPDATE assignments
  SET
    vehiclerequest = @vehiclerequest,
    requester = @requester,
    pickup_time = @pickup_time,
    return_time = @return_time,
    vehicle = @vehicle,
    vehicle_key = @vehicle_key,
    picked_up = @picked_up,
    return = @returned
  WHERE id = @id
  `).run(assignment)
}

export function insertAssignment (assignment) {
  return db.prepare(`
  INSERT INTO assignments (vehiclerequest, requester, pickup_time, return_time, vehicle, vehicle_key, picked_up, returned)
  VALUES (@vehiclerequest, @requester, @pickup_time, @return_time, @vehicle, @vehicle_key, @picked_up, @returned)
  `).run(assignment)
}

export function markAssignmentPickedUp (id) {
  return db.prepare('UPDATE assignments SET picked_up = true WHERE id = ?').run(id)
}

export function markAssignmentReturned (id) {
  return db.prepare('UPDATE assignments SET returned = true WHERE id = ?').run(id)
}

export function deleteAssignment (id) {
  return db.prepare('DELETE FROM assignments WHERE id = ?').run(id)
}

export function deleteAllAssignmentsForVehicleRequest (vehicleRequestId) {
  return db.prepare('DELETE FROM assignments WHERE vehiclerequest = ?').run(vehicleRequestId)
}

/*
 * Get the pending requests in the OPO Vehicle Request Table format.  This is a little clunky
 * because I'm trying to replicate the data format that the frontend expects.
 *
 * I'm also hampered by the fact that that the vehicle requests aren't dated, so we have to use two
 * different proxies for date depending on whether it's a trip or solo request. This wouldn't be as
 * annoying if I didn't have to nest everything after fetching it.
 */
export function getVehicleRequestsForOpo () {
  const now = (new Date()).getTime()
  const tripRequests = db.prepare(`
  SELECT
    vehiclerequests.id as request_id,
    trips.title,
    users.name as user_name,
    status
  FROM trips
  LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
  LEFT JOIN users ON requester = users.id
  WHERE trips.end_time > ? AND request_id IS NOT NULL
  `).all(now)
  const formattedTripRequests = tripRequests.map(request => {
    const requestedVehicles = getVehiclesForVehicleRequest(request.request_id)
    return {
      id: request.request_id,
      _id: request.request_id,
      requester: { name: request.user_name },
      status: request.status,
      associatedTrip: { title: request.title },
      requestedVehicles
    }
  })

  const soloRequests = db.prepare(`
    SELECT
      vehiclerequests.id AS request_id,
      request_details,
      users.name AS user_name,
      status
    FROM vehiclerequests
    LEFT JOIN users ON requester = users.id
    WHERE request_type = 'SOLO' AND vehiclerequests.id IN (
      SELECT DISTINCT vehiclerequest
      FROM requested_vehicles
      WHERE pickup_time > unixepoch() * 1000
    )
  `).all()
  const formattedSoloRequests = soloRequests.map(request => {
    const requestedVehicles = getVehiclesForVehicleRequest(request.request_id)
    return {
      id: request.request_id,
      _id: request.request_id,
      requester: { name: request.user_name },
      status: request.status,
      requestDetails: request.request_details,
      requestedVehicles
    }
  })

  return [...formattedTripRequests, ...formattedSoloRequests]
}

export function getPublicTrips () {
  const now = (new Date()).getTime()
  const trips = db.prepare(`
    SELECT location, club,  title, description, start_time, end_time
    FROM trips
    WHERE start_time > ?
    ORDER BY start_time ASC
    LIMIT 15`)
    .all(now)

  const allTrips = trips.map(trip => {
    const club = getClubName(trip.club)
    const startDateAndTime = convertSqlDate(trip.start_time)
    const endDateAndTime = convertSqlDate(trip.end_time)
    return { ...trip, club, startDateAndTime, endDateAndTime }
  })
  return allTrips
}

export function getAllTrips (getPastTrips = false) {
  const date = getPastTrips ? subtract(new Date(), 30, 'day') : new Date()
  const start_time = date.getTime()
  const trips = db.prepare('SELECT * FROM trips WHERE start_time > ?').all(start_time)
  const allTrips = trips.map(trip => {
    const club = getClubName(trip.club)
    const { owner, leaders, members, pending } = getTripParticipants(trip.id, trip.owner)
    const startDateAndTime = convertSqlDate(trip.start_time)
    const endDateAndTime = convertSqlDate(trip.end_time)
    const newTrip = {
      ...trip,
      _id: trip.id,
      club,
      number: trip.id,
      startDateAndTime,
      endDateAndTime,
      members,
      pending,
      owner,
      leaders
    }
    return formatTrip(newTrip)
  })
  return allTrips
}

function getTripMemberGearRequests (tripId) {
  return db
    .prepare(`
      SELECT id, trip, name, size_type, quantity
      FROM trip_gear
      LEFT JOIN (
        SELECT trip_gear as gearId, count(user) as quantity
        FROM member_gear_requests
        GROUP BY trip_gear
      ) ON gearId = id
      WHERE trip = ?
      `)
    .all(tripId)
    .map(gear => ({ ...gear, _id: gear.id, sizeType: gear.size_type }))
}

function getTripGroupGearRequests (tripId) {
  return db.prepare('SELECT name, quantity FROM group_gear_requests WHERE trip = ?').all(tripId)
}

export function getTripById (tripId) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId)
  const vehicleRequest = getVehicleRequestByTripId(tripId)
  const { owner, leaders, members, pending } = getTripParticipants(tripId, trip.owner)

  const enhancedTrip = {
    ...trip,
    number: trip.id,
    club: getClubName(trip.club),
    vehicleRequest,
    owner,
    leaders,
    members,
    pending,
    OPOGearRequests: getTripGroupGearRequests(trip.id),
    trippeeGear: getTripMemberGearRequests(trip.id),
    pcard: JSON.parse(trip.pcard),
    sent_emails: JSON.parse(trip.sent_emails),
    startTime: getTimeField(trip.start_time),
    endTime: getTimeField(trip.end_time),
    start_time: convertSqlDate(trip.start_time),
    end_time: convertSqlDate(trip.end_time)
  }

  return formatTrip(enhancedTrip)
}

const _48_HOURS_IN_MS = 172800000
const _2_HOURS_IN_MS = 7200000
const _90_MINS_IN_MS = 5400000
const _3_HOURS_IN_MS = 10800000

export function getTripsPendingCheckOutEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _48_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE start_time > ? AND start_time < ? AND sent_emails NOT LIKE '%CHECK_OUT%'
  `).run(now, emailWindow)
}

export function getTripsPendingCheckInEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _2_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time > ? AND end_time < ? AND sent_emails NOT LIKE '%CHECK_IN%'
  `).run(now, emailWindow)
}

export function getTripsPending90MinEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() + _90_MINS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time > ? AND returned = false AND sent_emails NOT LIKE '%LATE_90%'
  `).run(returnWindow)
}

export function getTripsPending3HourEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() + _3_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time > ? AND returned = false AND sent_emails NOT LIKE '%LATE_180%'
  `).run(returnWindow)
}

export function setTripLeftStatus (tripId, left) {
  return db.prepare('UPDATE trips SET left = ? WHERE id = ?').run(left, tripId)
}

export function setTripReturnedStatus (tripId, returned) {
  return db.prepare('UPDATE trips SET returned = ? WHERE id = ?').run(returned, tripId)
}

export function setTripGearStatus (tripId, status) {
  return db.prepare('UPDATE trips SET gear_status = ? WHERE id = ?').run(status, tripId)
}

export function setTripTrippeeGearStatus (tripId, status) {
  return db.prepare('UPDATE trips SET trippee_gear_status = ? WHERE id = ?').run(status, tripId)
}

export function setTripPcardStatus (tripId, pcard_status, pcard_assigned) {
  return db
    .prepare('UPDATE trips SET pcard_status = ?, pcard_assigned = ? WHERE id = ?')
    .run(pcard_status, pcard_assigned, tripId)
}

export function markTripEmailSent (tripId, emailName) {
  try {
    return db.prepare(`
    UPDATE trips
    SET sent_emails = json_insert(sent_emails, '$[#]', ?)
    WHERE id = ?
  `).run(emailName, tripId)
  } catch (error) {
    console.error(`Error updating email status ${emailName} for trip ${tripId}:`, error)
  }
}

export const markCheckOutEmail = (tripId) => markTripEmailSent(tripId, 'CHECK_OUT')
export const markCheckInEmail = (tripId) => markTripEmailSent(tripId, 'CHECK_IN')
export const mark90MinEmail = (tripId) => markTripEmailSent(tripId, 'LATE_90')

export function markTripLate (tripId) {
  try {
    markTripEmailSent(tripId, 'LATE_180')
    return db.prepare('UPDATE trips SET marked_late = true WHERE id = ?').run(tripId)
  } catch (error) {
    console.error(`Error updating marking trip ${tripId} late:`, error)
  }
}

export function getTripMember (tripId, userId) {
  return db
    .prepare('SELECT * FROM trip_members WHERE trip = ? AND user = ?')
    .get(tripId, userId)
}

export function insertPendingTripMember (tripId, userId, requested_gear) {
  return db.prepare(`
  INSERT INTO trip_members (trip, user, requested_gear)
  VALUES (?, ?, ?)
  `).run(tripId, userId, requested_gear)
}

export function promoteTripMemberToLeader (tripId, userId) {
  return db
    .prepare('UPDATE trip_members SET leader = true WHERE trip = ? AND user = ?')
    .run(tripId, userId)
}

export function demoteTripLeaderToMember (tripId, userId) {
  return db
    .prepare('UPDATE trip_members SET leader = false WHERE trip = ? AND user = ?')
    .run(tripId, userId)
}

export function admitTripMember (tripId, userId) {
  return db
    .prepare('UPDATE trip_members SET pending = false WHERE trip = ? AND user = ?')
    .run(tripId, userId)
}

export function unadmitTripMember (tripId, userId) {
  return db
    .prepare('UPDATE trip_members SET pending = true WHERE trip = ? AND user = ?')
    .run(tripId, userId)
}

export function setTripMemberAttendance (tripId, userId, attended) {
  return db
    .prepare('UPDATE trip_members SET attended = ? WHERE trip = ? AND user = ?')
    .run(attended, tripId, userId)
}

export function deleteTripMember (tripId, userId) {
  return db.prepare('DELETE FROM trip_members WHERE trip = ? AND user = ?').run(tripId, userId)
}

export function insertGearRequest (userId, gearId) {
  return db
    .prepare('INSERT INTO requested_gear (user, gear) VALUES (?, ?)')
    .run(userId, gearId)
}

export function updateTripMemberGearRequest (userId, trippeeGear) {
  db.prepare('DELETE FROM requested_gear WHERE user = ?').run(userId)
  trippeeGear.forEach(request => insertGearRequest(request.userId, request.gearId))
}

export function getFullTripView (tripId, forUser) {
  const trip = getTripById(tripId)
  // This will not work until the user has the correct ID
  let userTripStatus = 'NONE'
  let isLeaderOnTrip = false
  if (forUser) {
    const isPending = trip.pending.some(user => user.id === forUser.id)
    const isOnTrip = trip.members.some(user => user.id === forUser.id)

    if (isPending) userTripStatus = 'PENDING'
    if (isOnTrip) userTripStatus = 'APPROVED'

    if (forUser.role === 'OPO') {
      isLeaderOnTrip = true
    } else if (trip.coLeaderCanEditTrip) {
      isLeaderOnTrip = trip.leaders.some(leader => leader.toString() === forUser._id.toString())
    } else {
      isLeaderOnTrip = trip.owner.toString() === forUser._id.toString()
    }
  }

  return { trip: formatTrip(trip), userTripStatus, isLeaderOnTrip }
}

export function getTripByVehicleRequest (vehicleRequestId) {
  const { trip } = db.prepare('SELECT trip FROM vehiclerequests WHERE id = ?').get(vehicleRequestId)
  return getTripById(trip)
}

export function insertTrip (trip, leaders) {
  const info = db.prepare(`
  INSERT INTO trips (title, private, start_time, end_time, owner, description, club, cost,
    experience_needed, location, pickup, dropoff, mileage, coleader_can_edit, opo_gear_requests,
    trippee_gear, gear_status, trippee_gear_status, pcard_status, pcard)
  VALUES (@title, @private, @start_time, @end_time, @owner, @description, @club, @cost,
    @experience_needed, @location, @pickup, @dropoff, @mileage, @coleader_can_edit,
    @opo_gear_requests, @trippee_gear, @gear_status, @trippee_gear_status, @pcard_status, @pcard)
  `).run(trip)
  const id = info.lastInsertRowid

  // Insert leaders
  leaders.forEach(leaderId => {
    db.prepare('INSERT INTO trip_members (trip, user, leader, requested_gear) VALUES (?, ?, ?)')
      .run(id, leaderId, true)
  })

  return id
}

export function updateTrip (trip) {
  if (!trip.id) throw new Error(`Error, invalid trip ${trip.id} provided`)
  console.log(trip)
  const info = db.prepare(`
  UPDATE trips
  SET
    title = ifnull(@title, title),
    private = ifnull(@private, private),
    past = ifnull(@past, past),
    left = ifnull(@left, left),
    returned = ifnull(@returned, returned),
    marked_late = ifnull(@marked_late, marked_late),
    club = ifnull(@club, club),
    owner = ifnull(@owner, owner),
    start_time = ifnull(@start_time, start_time),
    end_time = ifnull(@end_time, end_time),
    location = ifnull(@location, location),
    pickup = ifnull(@pickup, pickup),
    dropoff = ifnull(@dropoff, dropoff),
    cost = ifnull(@cost, cost),
    description = ifnull(@description, description),
    experience_needed = ifnull(@experience_needed, experience_needed),
    coleader_can_edit = ifnull(@coleader_can_edit, coleader_can_edit),
    gear_status = ifnull(@gear_status, gear_status),
    trippee_gear_status = ifnull(@trippee_gear_status, trippee_gear_status),
    pcard = ifnull(@pcard, pcard),
    pcard_status = ifnull(@pcard_status, pcard_status),
    pcard_assigned = ifnull(@pcard_assigned, pcard_assigned),
    vehicle_status = ifnull(@vehicle_status, vehicle_status),
    sent_emails = ifnull(@sent_emails, sent_emails)
  WHERE id = @id
  `).run(trip)

  return info.changes
}

export function deleteTrip (id) {
  db.prepare('DELETE FROM trips WHERE id = ?').run(id)
}

export function replaceTripLeaders (tripId, leaders) {
  db.prepare('DELETE FROM trip_members WHERE trip = ? and leader = true').run(tripId)
  leaders.forEach(userId => {
    db.prepare('INSERT INTO trip_members (trip, user, leader) VALUES (?, ?, true)')
      .run(tripId, userId)
  })
}

export function updateRequestedGear (tripId, userId, requested_gear) {
  db.prepare('UPDATE trip_members SET requested_gear = ? WHERE trip = ? and user = ?')
    .run(requested_gear, tripId, userId)
}

export function createVehicleRequestForTrip (vehicleRequest, requestedVehicles) {
  const info = db.prepare(`
  INSERT INTO vehicles
    (requester, request_details, mileage, trip, request_type)
  VALUES (@requester, @request_details, @mileage, @trip, @request_type)
  `).run(vehicleRequest)
  const insertedId = info.lastInsertRowid

  requestedVehicles.forEach(vehicle => {
    vehicle.vehiclerequest = insertedId
    db.prepare(`
    INSERT INTO requested_vehicles
      (vehiclerequest, type, trailer_needed, pass_needed, recurring_vehicle, pickup_time,
      return_time)
    VALUES (@vehiclerequest, @type, @trailer_needed, @pass_needed, @recurring_vehicle, @pickup_time,
      @return_time)
    `).run(vehicle)
  })

  return insertedId
}

export function getUserTrips (userId) {
  const trips = db.prepare(`
  SELECT *
  FROM trips
  LEFT JOIN trip_members on trip_members.trip = trips.id
  LEFT JOIN clubs on trips.club = clubs.id
  WHERE trip_members.user = ?
  `).all(userId)

  return trips.map(trip => ({ ...trip, club: getClubName(trip.club) }))
}

export function getUserVehicleRequests (userId) {
  const vehicleRequests = db.prepare(`
  SELECT *
  FROM vehiclerequests
  WHERE requester = ?
  `).all(userId)

  return vehicleRequests
    .map(vehicleRequest => {
      const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(vehicleRequest.trip)
      return { ...vehicleRequest, trip }
    })
    .map(formatVehicleRequest)
}

export function getCalenderAssignments () {
  const timeWindow = subtract(new Date(), 30, 'day')
  const recentAssignments = db.prepare(`
  SELECT *
  FROM assignments
  WHERE pickup_time > ?
  `).all(timeWindow.getTime())

  const assignments = recentAssignments.map(assignment => {
    const dbVehicleRequest = db.prepare(`
    SELECT id, requester, request_type, request_details, trip
    FROM vehiclerequests
    WHERE id = ?
    `).get(assignment.vehiclerequest)
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(assignment.vehicle)

    const requester = db.prepare('SELECT name, email FROM users WHERE id = ?').get(dbVehicleRequest.requester)
    const trip = db.prepare(`
    SELECT id, title, description, start_time, end_time
    FROM trips
    WHERE id = ?
    `).get(dbVehicleRequest.trip)

    const assigned_pickupDateAndTime = convertSqlDate(assignment.pickup_time)
    const assigned_returnDateAndTime = convertSqlDate(assignment.return_time)
    const vehiclerequest = formatVehicleRequest(dbVehicleRequest)
    vehiclerequest.associatedTrip = formatTrip(trip)
    const assigned_vehicle = formatVehicle(vehicle)

    return {
      ...assignment,
      vehiclerequest,
      requester,
      responseIndex: 0, // idk man
      pickup_time: assignment.pickup_time === 1,
      returned: assignment.pickup_time === 1,
      assigned_vehicle,
      assigned_pickupDateAndTime,
      assigned_returnDateAndTime
    }
  }).map(formatAssignment)

  return assignments
}

export function getUserEmails (ids) {
  return ids.map(id => {
    const { email } = db.prepare('SELECT email FROM users WHERE id = ?').get(id)
    return email
  })
}

export function getTripLeaderEmails (tripId) {
  return db.prepare(`
  SELECT email
  FROM users
  LEFT JOIN trip_members ON user = users.id
  WHERE leader = true AND trip = ?
  `).run(tripId)
}
