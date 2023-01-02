/**
 * Fetch data from SQLite and format it in a way the frontend expects.
 *
 * If you're looking at this file and thinking "geez why is so complicated" it's because the
 * frontend currently expects a deeply nested data structure. There's no inherent reason the
 * frontend has to do this; in fact many times the frontend does a lot of work to unpack the nested
 * data structure.
 *
 * I've opted to fix these problems on at a time: first by writing a backend that stores the data in
 * a simple structure (the database schema). When the frontend makes an API call, the backend mimics
 * the complex data structure of the frontend by deeply nesting all its data. Next I'll write a
 * frontend that expects data in a simpler format (HTML) and write simple backend APIs for the SQL
 * table that surface that data. Such are the delights and perils of working with legacy code (i.e.
 * basically all code).
 *
 * Anyway, if you're here to fix something, don't be intimidated. Just look upstream at the router
 * to figure out which function gets called as a result of your API call, and then find that
 * function here. It's usually one or two SQL statements followed by a lot of renaming.
 */
import fs from 'node:fs'
import Database from 'better-sqlite3'
import { subtract } from 'date-arithmetic'

let db

export function start (name) {
  if (db !== undefined) throw new Error('ERROR: tried to start sqlite db that was already running')

  const dbName = name || ':memory:'
  try {
    db = new Database(dbName, { fileMustExist: true })
  } catch (err) {
    if (err.code === 'SQLITE_CANTOPEN') {
      console.error(err)
      throw new Error(`Failed to open db ${dbName}. Did you remember to initialize the database?`)
    }
  }
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  console.log(`Starting sqlite database from file: ${getDatabaseFile()}`)
}

// Return the DB so that rest modules can interact with it directly
export const getDb = () => db

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

function getDateField (unixDate) {
  if (!unixDate) return undefined
  const date = new Date(unixDate)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
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
  const assigned_pickupDateAndTime = convertSqlDate(assignment.pickup_time)
  const assigned_returnDateAndTime = convertSqlDate(assignment.return_time)
  return {
    ...assignment,
    _id: assignment.id.toString(),
    assigned_key: assignment.vehicle_key,
    assigned_vehicle: assignment.vehicle,
    assigned_pickupTime: getTimeField(assignment.pickup_time),
    assigned_returnTime: getTimeField(assignment.return_time),
    assigned_pickupDate: getDateField(assignment.pickup_time),
    assigned_returnDate: getDateField(assignment.return_time),
    assigned_pickupDateAndTime,
    assigned_returnDateAndTime,
    pickedUp: assignment.picked_up === 1,
    returned: assignment.returned === 1,
    responseIndex: assignment.response_index || 0
  }
}

function formatClub (club) {
  if (club === undefined) return undefined
  return { ...club, _id: club.id.toString() }
}

function formatVehicle (vehicle) {
  if (vehicle === undefined) return undefined
  return { ...vehicle, _id: vehicle.id.toString() }
}

function formatVehicleRequest (vehicleRequest) {
  if (vehicleRequest === undefined) return undefined
  let status = 'pending'
  if (vehicleRequest.is_approved === 1) status = 'approved'
  if (vehicleRequest.is_approved === 0) status = 'denied'

  return {
    ...vehicleRequest,
    _id: vehicleRequest.id.toString(),
    number: vehicleRequest.id,
    requestDetails: vehicleRequest.request_details,
    noOfPeople: vehicleRequest.num_participants,
    associatedTrip: vehicleRequest.trip,
    requestType: vehicleRequest.request_type,
    status
  }
}

function formatTrip (trip) {
  if (trip === undefined) return undefined

  return {
    ...trip,
    _id: trip.id.toString(),
    number: trip.id,
    markedLate: trip.marked_late,
    startTime: getTimeField(trip.start_time),
    endTime: getTimeField(trip.end_time),
    startDate: convertSqlDate(trip.start_time),
    endDate: convertSqlDate(trip.end_time),
    startDateAndTime: convertSqlDate(trip.start_time),
    endDateAndTime: convertSqlDate(trip.end_time),
    experienceNeeded: trip.experience_needed,
    coLeaderCanEditTrip: trip.coleader_can_edit,
    sent_emails: JSON.parse(trip.sent_emails)
  }
}

function formatRequestedVehicle (vehicle) {
  if (vehicle === undefined) return undefined
  const pickup_time = convertSqlDate(vehicle.pickup_time)
  const return_time = convertSqlDate(vehicle.return_time)
  return {
    vehicleType: vehicle.type,
    vehicleDetails: vehicle.details,
    pickupTime: getTimeField(vehicle.pickup_time),
    returnTime: getTimeField(vehicle.return_time),
    pickupDate: pickup_time,
    returnDate: return_time,
    pickupDateAndTime: pickup_time,
    returnDateAndTime: return_time,
    trailerNeeded: vehicle.trailer_needed,
    passNeeded: vehicle.pass_needed
  }
}

/*
 * DATABASE FUNCTIONS
 * Create, read, update, or delete from the database.
 */
function getClubName (id) {
  return db.prepare('SELECT name FROM clubs WHERE id = ?').get(id)
}

function getTripParticipants (tripId, ownerId, showUserData) {
  const users = db.prepare(`
    SELECT users.id, users.email, users.name, pending, leader, attended, height, shoe_size,
      clothe_size, allergies_dietary_restrictions, medical_conditions, pronoun, dash_number
    FROM trip_members
    LEFT JOIN users ON trip_members.user = users.id
    WHERE trip_members.trip = ?
  `)
    .all(tripId)
    .map(user => {
      const { driver_cert, trailer_cert } = getCertsForUser(user.id)
      const frontendUser = {
        id: user.id,
        _id: user.id.toString(),
        email: user.email,
        name: user.name,
        height: user.height,
        shoe_size: user.shoe_size,
        clothe_size: user.clothe_size,
        leader_for: getLeaderFor(user.id),
        driver_cert,
        trailer_cert,
        completedProfile: true
      }
      if (showUserData) {
        frontendUser.medical_conditions = user.medical_conditions
        frontendUser.allergies_dietary_restrictions = user.allergies_dietary_restrictions
        frontendUser.pronoun = user.pronoun
        frontendUser.dash_number = user.dash_number
      }
      return {
        attended: user.attended,
        user: frontendUser,
        requestedGear: getMemberGearRequests(tripId, user.id),
        pending: user.pending,
        leader: user.leader
      }
    })

  const owner = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(ownerId)
  const members = users.filter(user => user.pending === 0)
  const pending = users.filter(user => user.pending === 1)
  const leaders = users.filter(user => user.leader === 1).map(item => item.user)
  return { owner, leaders, members, pending }
}

function getLeaderFor (userId) {
  return db.prepare(`
  SELECT clubs.id, name, active
  FROM club_leaders
  LEFT JOIN clubs ON club = clubs.id
  WHERE user = ? AND is_approved = true
  `).all(userId)
    .map(formatClub)
}

function enhanceUser (user) {
  if (!user) return user

  const requested_clubs = db.prepare(`
  SELECT clubs.id, name
  FROM club_leaders
  LEFT JOIN clubs ON club = clubs.id
  WHERE user = ? AND is_approved = false
  `).all(user.id)

  const requested_certs = getUsersPendingCertApprovals()
    .find(pendingUser => pendingUser.id === user.id) || []
  const leader_for = getLeaderFor(user.id)
  if (user.is_opo) {
    user.role = 'OPO'
  } else {
    user.role = leader_for.length > 0 ? 'Leader' : 'Trippee'
  }

  const { driver_cert, trailer_cert } = getCertsForUser(user.id)

  user._id = user.id.toString()
  user.casID = user.cas_id
  user.leader_for = leader_for
  user.driver_cert = driver_cert
  user.trailer_cert = trailer_cert
  user.requested_clubs = requested_clubs
  user.requested_certs = requested_certs
  user.has_pending_leader_change = requested_clubs.length !== 0
  user.has_pending_cert_change = requested_certs.length !== 0

  return user
}

export function getClubs () {
  return db.prepare('SELECT * FROM clubs').all().map(formatClub)
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
    user._id = user.id.toString()
    const requested_clubs = clubRequestsByUser[userId].map(clubId => {
      const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(clubId)
      return formatClub(club)
    })
    return { ...user, requested_clubs }
  })
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

function getCertsForUser (userId) {
  const certs = db.prepare(`
  SELECT '[' || group_concat(cert, ',') || ']' as certs
  FROM user_certs
  JOIN users on users.id = user
  WHERE is_approved = TRUE AND users.id = ?
  GROUP BY user
  `).get(userId)?.certs || '[]'

  let driver_cert
  if (certs.includes('MICROBUS')) {
    driver_cert = 'MICROBUS'
  } else if (certs.includes('VAN')) {
    driver_cert = 'VAN'
  } else {
    driver_cert = null
  }
  const trailer_cert = certs.includes('TRAILER') ? 'true' : false
  return { driver_cert, trailer_cert }
}

export function getUsersPendingCertApprovals () {
  const users = db.prepare(`
  SELECT id, user, name, '[' || group_concat(cert, ',') || ']' as certs
  FROM user_certs
  JOIN users on users.id = user
  WHERE is_approved = FALSE
  GROUP BY user
  `).all()
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
    return { id, name, _id: id.toString(), requested_certs }
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
  return users.map(user => ({ ...user, _id: user.id.toString() }))
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
    pronoun = ifnull(@pronoun, pronoun),
    dash_number = ifnull(@dash_number, dash_number),
    allergies_dietary_restrictions = ifnull(@allergies_dietary_restrictions, allergies_dietary_restrictions),
    medical_conditions = ifnull(@medical_conditions, medical_conditions),
    clothe_size = ifnull(@clothe_size, clothe_size),
    shoe_size = ifnull(@shoe_size, shoe_size),
    height = ifnull(@height, height)
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
    .prepare('INSERT INTO vehicles (name, type) VALUES (?, ?)')
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
      (vehiclerequest, type, details, pickup_time, return_time, trailer_needed, pass_needed)
    VALUES (@vehiclerequest, @type, @details, @pickup_time, @return_time, @trailer_needed, @pass_needed)
  `).run(requestedVehicle)
}

export function replaceRequestedVehicles (vehicleRequestId, requestedVehicles) {
  // Mimic the way this data used to be store (delete the old "array", add a new one)
  db.prepare('DELETE FROM requested_vehicles WHERE vehiclerequest = ?').run(vehicleRequestId)
  requestedVehicles
    .map(vehicle => ({ ...vehicle, vehiclerequest: vehicleRequestId }))
    .forEach(insertRequestedVehicle)
}

export function getVehicleRequestById (id) {
  const vehicleRequest = db.prepare('SELECT * FROM vehiclerequests WHERE id = ?').get(id)
  if (!vehicleRequest) return undefined
  vehicleRequest.requestedVehicles = db
    .prepare('SELECT * FROM requested_vehicles WHERE vehiclerequest = ?')
    .all(id)
    .map(formatRequestedVehicle)
  vehicleRequest.assignments = getAssignmentsForVehicleRequest(id)
  return formatVehicleRequest(vehicleRequest)
}

export function getVehicleRequestByTripId (tripId) {
  const request = db.prepare('SELECT id FROM vehiclerequests WHERE trip = ?').get(tripId)
  return request ? getVehicleRequestById(request.id) : undefined
}

export function getUserVehicleRequests (userId) {
  return db.prepare('SELECT id FROM vehiclerequests WHERE requester = ?')
    .all(userId)
    .map(request => getVehicleRequestById(request.id))
    .map(request => ({ ...request, trip: getTripById(request.trip) }))
}

export function insertVehicleRequest (vehicleRequest, requestedVehicles) {
  const info = db.prepare(`
  INSERT INTO vehiclerequests
    (requester, request_details, mileage, trip, request_type)
  VALUES (@requester, @request_details, @mileage, @trip, @request_type)
  `).run(vehicleRequest)
  const requestId = info.lastInsertRowid

  requestedVehicles.forEach(vehicle => {
    vehicle.vehiclerequest = requestId
    vehicle.details = vehicle.vehicleDetails || null
    db.prepare(`
    INSERT INTO requested_vehicles
      (vehiclerequest, type, details, trailer_needed, pass_needed, pickup_time, return_time)
    VALUES (@vehiclerequest, @type, @details, @trailer_needed, @pass_needed, @pickup_time,
      @return_time)
    `).run(vehicle)
  })

  return requestId
}

export function updateVehicleRequest (vehicleRequest, vehicles) {
  const info = db.prepare(`
  UPDATE vehiclerequests
  SET
    requester = @requester,
    request_details = @request_details,
    mileage = @mileage,
    num_participants = @num_participants,
    trip = @trip,
    request_type = @request_type
  WHERE id = @id
  `).run(vehicleRequest)
  replaceRequestedVehicles(vehicleRequest.id, vehicles)
  return info.changes
}

export function markVehicleRequestApproved (id) {
  const info = db.prepare('UPDATE vehiclerequests SET is_approved = true WHERE id = ?').run(id)
  return info.changes
}

export function markVehicleRequestDenied (id) {
  const info = db.prepare('UPDATE vehiclerequests SET is_approved = false WHERE id = ?').run(id)
  return info.changes
}

export function deleteVehicleRequestForTrip (tripId) {
  // Deletes assignments as well thanks to cascading
  const info = db.prepare('DELETE FROM vehiclerequests WHERE trip = ?').run(tripId)
  return info.changes
}

export function deleteVehicleRequest (vehicleRequestId) {
  // Deletes assignments as well thanks to cascading
  const info = db.prepare('DELETE FROM vehiclerequests WHERE id = ?').run(vehicleRequestId)
  return info.changes
}

export function resetTripVehicleStatus (id) {
  const info = db.prepare('UPDATE trips SET vehicle_status = NULL WHERE id = ?').run(id)
  return info.changes
}

export function markTripVehicleAssignmentsPickedUp (tripId) {
  const vehicleRequest = getVehicleRequestByTripId(tripId)
  if (!vehicleRequest) return undefined
  return db
    .prepare('UPDATE assignments SET picked_up = true WHERE vehiclerequest = ?')
    .run(vehicleRequest.id)
}

export function markTripVehicleAssignmentsReturned (tripId) {
  const vehicleRequest = getVehicleRequestByTripId(tripId)
  if (!vehicleRequest) return undefined
  return db
    .prepare('UPDATE assignments SET returned = true WHERE vehiclerequest = ?')
    .run(vehicleRequest.id)
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
    response_index = @response_index
  WHERE id = @id
  `).run(assignment)
}

export function insertAssignment (assignment) {
  return db.prepare(`
  INSERT INTO assignments
    (vehiclerequest, requester, pickup_time, return_time, vehicle, vehicle_key, response_index)
  VALUES
    (@vehiclerequest, @requester, @pickup_time, @return_time, @vehicle, @vehicle_key, @response_index)
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
    iif(is_approved IS NULL, 'pending', iif(is_approved = 0, 'denied', 'approved')) as status
  FROM trips
  LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
  LEFT JOIN users ON requester = users.id
  WHERE trips.end_time > ? AND request_id IS NOT NULL
  `).all(now)
  const formattedTripRequests = tripRequests.map(request => {
    const requestedVehicles = getVehiclesForVehicleRequest(request.request_id)
    return {
      id: request.request_id,
      _id: request.request_id.toString(),
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
      iif(is_approved IS NULL, 'pending', iif(is_approved = 0, 'denied', 'approved')) as status
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
      _id: request.request_id.toString(),
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
    WHERE start_time > ? AND private = 0
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

export function getAllTrips (getPastTrips = false, showUserData = false) {
  const date = getPastTrips ? subtract(new Date(), 30, 'day') : new Date()
  const start_time = date.getTime()
  const showPrivate = showUserData ? '' : 'AND private = 0'
  return db.prepare(`SELECT id FROM trips WHERE end_time > ? ${showPrivate}`)
    .all(start_time)
    .map(trip => getTripById(trip.id, showUserData))
}

function getTripIndividualGear (tripId) {
  return db
    .prepare(`
      SELECT id, trip, name, size_type, quantity
      FROM trip_required_gear
      LEFT JOIN (
        SELECT gear as gearId, count(user) as quantity
        FROM member_gear_requests
        GROUP BY gear
      ) ON gearId = id
      WHERE trip = ?
      `)
    .all(tripId)
    .map(gear => ({ ...gear, _id: gear.id.toString(), sizeType: gear.size_type }))
}

function getTripGroupGearRequests (tripId) {
  return db.prepare('SELECT name, quantity FROM group_gear_requests WHERE trip = ?').all(tripId)
}

export function getTripById (tripId, showUserData = false) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId)
  if (!trip) return undefined
  const vehicleRequest = getVehicleRequestByTripId(tripId)
  const { owner, leaders, members, pending } = getTripParticipants(tripId, trip.owner, showUserData)

  // Get the "pending" or "N/A" status depending on whether there are gear requests
  const num_trippee_gear_requests = db.prepare(`
    SELECT iif(member_gear_approved IS NULL,
               iif(count(*) > 0, 'pending', 'N/A'),
               iif(member_gear_approved = 1, 'approved', 'denied')) as status
    FROM member_gear_requests
    LEFT JOIN trips ON trips.id = trip
    WHERE trip = ?
  `).get(tripId)
  const num_group_gear_requests = db.prepare(`
    SELECT iif(group_gear_approved IS NULL,
               iif(count IS NULL, 'N/A', 'pending'),
               iif(group_gear_approved = 1, 'approved', 'denied')) as status
    FROM trips
    LEFT JOIN (
      SELECT trip, count(*) as count
      FROM group_gear_requests
      GROUP BY trip)
    ON trip = id where id = ?
    `).get(tripId)

  const enhancedTrip = {
    ...trip,
    club: getClubName(trip.club),
    vehicleRequest,
    owner,
    leaders,
    members,
    pending,
    OPOGearRequests: getTripGroupGearRequests(trip.id),
    trippeeGear: getTripIndividualGear(trip.id),
    gearStatus: num_group_gear_requests.status,
    trippeeGearStatus: num_trippee_gear_requests.status,
    pcard: [],
    pcardStatus: 'N/A',
    pcardAssigned: 'None',
    vehicleStatus: getVehicleRequestByTripId(trip.id)?.status || 'N/A'
  }

  const pcard_request = db.prepare('SELECT * from trip_pcard_requests WHERE trip = ?').get(tripId)
  if (pcard_request) {
    if (pcard_request.is_approved === null) enhancedTrip.pcardStatus = 'pending'
    if (pcard_request.is_approved === 1) enhancedTrip.pcardStatus = 'approved'
    if (pcard_request.is_approved === 0) enhancedTrip.pcardStatus = 'denied'

    enhancedTrip.pcardAssigned = pcard_request.assigned_pcard
    enhancedTrip.pcard = [{
      ...pcard_request,
      numPeople: pcard_request.num_people,
      otherCosts: JSON.parse(pcard_request.other_costs)
    }]
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
  `).all(now.getTime(), emailWindow.getTime())
}

export function getTripsPendingCheckInEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _2_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time > ? AND end_time < ? AND sent_emails NOT LIKE '%CHECK_IN%'
  `).all(now.getTime(), emailWindow.getTime())
}

export function getTripsPending90MinEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _90_MINS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_90%'
  `).all(returnWindow.getTime())
}

export function getTripsPending3HourEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _3_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_180%'
  `).all(returnWindow.getTime())
}

export function setTripLeftStatus (tripId, left) {
  return db.prepare('UPDATE trips SET left = ? WHERE id = ?').run(left, tripId)
}

export function setTripReturnedStatus (tripId, returned) {
  return db.prepare('UPDATE trips SET returned = ? WHERE id = ?').run(returned, tripId)
}

function setTripGroupGearApproval (tripId, approved) {
  return db.prepare('UPDATE trips SET group_gear_approved = ? WHERE id = ?').run(approved, tripId)
}
export const approveTripGroupGear = (tripId) => setTripGroupGearApproval(tripId, 1)
export const denyTripGroupGear = (tripId) => setTripGroupGearApproval(tripId, 0)
export const resetTripGroupGear = (tripId) => setTripGroupGearApproval(tripId, null)

function setMemberGearApproval (tripId, approved) {
  return db.prepare('UPDATE trips SET member_gear_approved = ? WHERE id = ?').run(approved, tripId)
}
export const approveTripIndividualGear = (tripId) => setMemberGearApproval(tripId, 1)
export const denyTripIndividualGear = (tripId) => setMemberGearApproval(tripId, 0)
export const resetTripIndividualGear = (tripId) => setMemberGearApproval(tripId, null)

export function setTripIndividualGearStatus (tripId, status) {
  return db.prepare('UPDATE trips SET member_gear_approved = ? WHERE id = ?').run(status, tripId)
}

export function setTripPcardStatus (tripId, is_approved, assigned_pcard) {
  return db
    .prepare('UPDATE trip_pcard_requests SET is_approved = ?, assigned_pcard = ? WHERE trip = ?')
    .run(is_approved, assigned_pcard, tripId)
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
    .prepare(`
    SELECT trip, user, leader, attended, pending, iif(user = owner, true, false) as is_owner
    FROM trip_members
    LEFT JOIN (SELECT owner FROM trips WHERE id = @tripId)
    WHERE trip = @tripId AND user = @userId`)
    .get({ tripId, userId })
}

export function getMemberGearRequests (tripId, userId) {
  return db.prepare(`
    SELECT trip_required_gear.id, trip_required_gear.name
    FROM member_gear_requests
    LEFT JOIN trip_required_gear ON trip_required_gear.id = member_gear_requests.gear
    WHERE trip_required_gear.trip = ? AND user = ?`
  ).all(tripId, userId)
    .map(request => ({ gearId: request.id, name: request.name }))
}

export function insertPendingTripMember (tripId, userId, requested_gear) {
  db.prepare('INSERT INTO trip_members (trip, user) VALUES (?, ?)').run(tripId, userId)
  requested_gear.forEach(gear => {
    db.prepare('INSERT OR IGNORE INTO member_gear_requests (trip, user, gear) VALUES (?, ?, ?)')
      .run(tripId, userId, gear.gearId)
  })
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

export function updateTripMemberGearRequest (tripId, userId, trippeeGear) {
  db.prepare('DELETE FROM member_gear_requests WHERE trip = ? AND user = ?').run(tripId, userId)
  trippeeGear.forEach(request => {
    db.prepare('INSERT INTO member_gear_requests (trip, user, gear) VALUES (?, ?, ?)')
      .run(tripId, userId, request.gearId)
  })
}

export function getFullTripView (tripId, forUser) {
  const showUserData = forUser?.role === 'OPO' || forUser?.role === 'Leader'
  const trip = getTripById(tripId, showUserData)
  if (!trip) return undefined

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
      isLeaderOnTrip = trip.leaders.some(leader => leader.id === forUser.id)
    } else {
      isLeaderOnTrip = trip.owner === forUser.id
    }
  }

  // Note that formatTrip was already called by getTripById
  return { trip, userTripStatus, isLeaderOnTrip }
}

export function getTripByVehicleRequest (vehicleRequestId) {
  const { trip } = db.prepare('SELECT trip FROM vehiclerequests WHERE id = ?').get(vehicleRequestId)
  return trip ? getTripById(trip) : undefined
}

export function insertTrip (trip, leaders, trip_required_gear, group_gear_requests, pcard_request) {
  const info = db.prepare(`
  INSERT INTO trips (title, private, start_time, end_time, owner, description, club, cost,
    experience_needed, location, pickup, dropoff, coleader_can_edit)
  VALUES (@title, @private, @start_time, @end_time, @owner, @description, @club, @cost,
    @experience_needed, @location, @pickup, @dropoff, @coleader_can_edit)
  `).run(trip)
  const id = info.lastInsertRowid

  leaders.forEach(leaderId => {
    db.prepare('INSERT INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)')
      .run(id, leaderId, 1, 0)
  })

  trip_required_gear.forEach(gear => insertTripRequiredGear(id, gear.name, gear.sizeType))
  group_gear_requests.forEach(request => {
    db.prepare('INSERT INTO group_gear_requests (trip, name, quantity) VALUES (?, ?, ?)')
      .run(id, request.name, request.quantity)
  })

  if (pcard_request) insertTripPcardRequest(id, pcard_request)

  return id
}

export function updateTrip (trip, trip_required_gear, group_gear_requests, pcard_request) {
  if (!trip.id) throw new Error(`Error, invalid trip ${trip.id} provided`)
  const info = db.prepare(`
  UPDATE trips
  SET
    title = ifnull(@title, title),
    private = ifnull(@private, private),
    start_time = ifnull(@start_time, start_time),
    end_time = ifnull(@end_time, end_time),
    description = ifnull(@description, description),
    coleader_can_edit = ifnull(@coleader_can_edit, coleader_can_edit),
    club = ifnull(@club, club),
    location = ifnull(@location, location),
    pickup = ifnull(@pickup, pickup),
    dropoff = ifnull(@dropoff, dropoff),
    cost = ifnull(@cost, cost),
    experience_needed = ifnull(@experience_needed, experience_needed)
  WHERE id = @id
  `).run(trip)

  const gearIdList = db.prepare('SELECT id FROM trip_required_gear WHERE trip = ?').all(trip.id)
  const toAdd = trip_required_gear.filter(gear => !gear.id)
  // We do this to preserve the IDs so that linked gear requests won't be deleted
  const toDelete = gearIdList.filter(gear => {
    return !trip_required_gear.some(item => item.id === gear.id)
  })

  toAdd.forEach(gear => insertTripRequiredGear(trip.id, gear.name, gear.sizeType))
  toDelete.forEach(gear => deletetripRequiredGearFromList(trip.id, gear.id))

  // Replace group gear requests
  db.prepare('DELETE FROM group_gear_requests WHERE trip = ?').run(trip.id)
  group_gear_requests.forEach(request => insertGroupGearRequest(trip.id, request.name, request.quantity))

  if (pcard_request) replaceTripPcardRequest(trip.id, pcard_request)

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

function insertGroupGearRequest (tripId, name, quantity) {
  return db.prepare('INSERT INTO group_gear_requests (trip, name, quantity) VALUES (?, ?, ?)')
    .run(tripId, name, quantity)
}

function insertTripRequiredGear (trip, name, sizeType) {
  return db.prepare('INSERT INTO trip_required_gear (trip, name, size_type) VALUES (?, ?, ?)')
    .run(trip, name, sizeType)
}

function deletetripRequiredGearFromList (tripId, gearId) {
  return db.prepare('DELETE FROM trip_required_gear WHERE trip = ? AND id = ?')
    .run(tripId, gearId)
}

function insertTripPcardRequest (tripId, pcard_request) {
  pcard_request.trip = tripId
  return db.prepare(`
    INSERT INTO trip_pcard_requests
      (trip, num_people, snacks, breakfast, lunch, dinner, other_costs)
    VALUES (@trip, @num_people, @snacks, @breakfast, @lunch, @dinner, @other_costs)
  `).run(pcard_request)
}

function replaceTripPcardRequest (tripId, pcard_request) {
  db.prepare('DELETE FROM trip_pcard_requests WHERE trip = ?').run(tripId)
  insertTripPcardRequest(tripId, pcard_request)
}

export function getUserTrips (userId) {
  const trips = db.prepare(`
  SELECT trip
  FROM trip_members
  WHERE user = ?
  `).all(userId)

  return trips.map(item => getTripById(item.trip))
}

export function getCalendarAssignments () {
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

    const vehicle = getVehicle(assignment.vehicle)
    const requester = db.prepare('SELECT name, email FROM users WHERE id = ?')
      .get(dbVehicleRequest.requester)
    const vehiclerequest = formatVehicleRequest(dbVehicleRequest)
    vehiclerequest.associatedTrip = getTripById(dbVehicleRequest.trip)

    return {
      ...assignment,
      requester,
      request: vehiclerequest,
      vehicle: formatVehicle(vehicle)
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

export function getTripLeaderIds (tripId) {
  return db.prepare(`
  SELECT user
  FROM users
  LEFT JOIN trip_members ON user = users.id
  WHERE leader = true AND trip = ?
  `).all(tripId)
    .map(user => user.user)
}

export function getTripLeaderEmails (tripId) {
  return db.prepare(`
  SELECT email
  FROM users
  LEFT JOIN trip_members ON user = users.id
  WHERE leader = true AND trip = ?
  `).all(tripId)
    .map(user => user.email)
}

/**
 * REST functions
 */
export function getTripLeaderNames (tripId) {
  return db.prepare(`
  SELECT name
  FROM users
  LEFT JOIN trip_members ON user = users.id
  WHERE leader = true AND trip = ?
  `).all(tripId)
    .map(user => user.name).join(', ')
}
