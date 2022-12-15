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
    startDateAndTime: trip.start_time,
    endDateAndTime: trip.end_time,
    experienceNeeded: trip.experience_needed,
    coLeaderCanEditTrip: trip.coleader_can_edit,
    trippeeGearStatus: trip.trippee_gear_status,
    gearStatus: trip.gear_status,
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

function getTripParticipantNames (tripId, ownerId) {
  const users = db.prepare(`
  SELECT users.id, users.name, pending, leader
  FROM trip_members
  LEFT JOIN users ON trip_members.user = users.id
  WHERE trip_members.trip = ?`).all(tripId)

  const owner = db.prepare('SELECT name FROM users WHERE id = ?').get(ownerId)
  const members = users.filter(user => user.pending === 0).map(item => ({ user: item }))
  const pending = users.filter(user => user.pending === 1).map(item => ({ user: item }))
  const leaders = users.filter(user => user.leader === 1)
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

  user._id = user.id
  user.casID = user.cas_id
  user.leader_for = leader_for
  user.requested_clubs = requested_clubs

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

export function markTripVehicleStatusDenied (id) {
  const info = db.prepare("UPDATE trips SET vehicle_status = 'denied' WHERE id = ?").run(id)
  return info.changes
}

export function markTripVehicleStatusApproved (id) {
  const info = db.prepare("UPDATE trips SET vehicle_status = 'approved' WHERE id = ?").run(id)
  return info.changes
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
    vehiclerequests.id request_id,
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
    const { owner, leaders, members, pending } = getTripParticipantNames(trip.id, trip.owner)
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

export function getTripById (tripId, forUser) {
  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(tripId)
  const vehicleRequest = db.prepare('SELECT * from vehiclerequests where trip = ?').get(tripId)
  const { owner, leaders, members, pending } = getTripParticipantNames(tripId, trip.owner)

  // This will not work until the user has the correct ID
  let userTripStatus = 'NONE'
  let isLeaderOnTrip = false
  if (forUser) {
    const isPending = pending.some(user => user.id === forUser.id)
    const isOnTrip = members.some(user => user.id === forUser.id)

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

  const enhancedTrip = {
    ...trip,
    number: trip.id,
    club: getClubName(trip.club),
    vehicleRequest,
    owner,
    leaders,
    members,
    pending,
    startDateAndTime: convertSqlDate(trip.start_time),
    endDateAndTime: convertSqlDate(trip.end_time)
  }
  return { trip: formatTrip(enhancedTrip), userTripStatus, isLeaderOnTrip }
}

export function getTripByVehicleRequest (vehicleRequestId) {
  const { trip } = db.prepare('SELECT trip FROM vehiclerequests WHERE id = ?').get(vehicleRequestId)
  return getTripById(trip)
}

export function getUserTrips (userId) {
  const trips = db.prepare(`
  SELECT *
  FROM trips
  LEFT JOIN trip_members on trip_members.trip = trips.id
  LEFT JOIN club on trips.club = clubs.id
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
