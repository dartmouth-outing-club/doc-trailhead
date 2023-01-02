import * as db from '../services/sqlite.js'
import * as constants from '../constants.js'
import * as mailer from '../services/mailer.js'
import * as Users from '../controllers/user-controller.js'
import * as VehicleRequests from './vehicle-request-controller.js'

async function sendLeadersEmail (tripId, subject, message) {
  const leaderEmails = db.getTripLeaderEmails(tripId)
  return mailer.send({ address: leaderEmails, subject, message })
}

export async function getPublicTrips (_req, res) {
  try {
    return res.json(db.getPublicTrips())
  } catch (error) {
    console.error(error)
    return res.status(500).send(error.message)
  }
}

export async function handleGetTrips (req, res) {
  const getPastTrips = req.query.getPastTrips !== 'false'
  const showUserData = req.user.role === 'OPO' || req.user.role === 'Leader'
  const allTrips = db.getAllTrips(getPastTrips, showUserData)
  return res.json(allTrips)
}

/**
 * Fetches only trips that have gear, P-Card, or vehicle requests.
 */
export async function handleGetOpoTrips (req, res) {
  const getPastTrips = req.query.getOldTrips !== 'false'
  const allTrips = db.getAllTrips(getPastTrips, true)

  const filteredTrips = allTrips.filter(trip => {
    const { trippeeGearStatus, gearStatus, pcardStatus, vehicleStatus } = trip
    return trippeeGearStatus !== 'N/A' ||
      gearStatus !== 'N/A' ||
      pcardStatus !== 'N/A' ||
      vehicleStatus !== 'N/A'
  })

  return res.json(filteredTrips)
}

/**
 * Fetches a single trip with all fields populated.
 */
export async function getTrip (req, res) {
  const tripId = req.params.tripID
  const requestingUser = req.user
  const trip = db.getFullTripView(tripId, requestingUser)
  return res.json(trip)
}

export async function createTrip (creator, data) {
  // Creates the new trip
  const trip = {
    title: data.title || 'Untitled trip',
    private: data.private ? 1 : 0,
    start_time: constants.createIntegerDateObject(data.startDate, data.startTime),
    end_time: constants.createIntegerDateObject(data.endDate, data.endTime),
    owner: creator.id,
    description: data.description,
    club: data.club._id,
    cost: data.cost || 0,
    experience_needed: data.experienceNeeded ? 1 : 0,
    location: data.location,
    pickup: data.pickup,
    dropoff: data.dropoff,
    mileage: data.mileage,
    coleader_can_edit: data.coLeaderCanEditTrip ? 1 : 0
  }

  let pcard_request
  if (data.pcard?.at(0)) {
    const request = data.pcard?.at(0)
    pcard_request = {
      snacks: request.snacks,
      breakfast: request.breakfast,
      lunch: request.lunch,
      dinner: request.dinner,
      num_people: request.numPeople,
      other_costs: request.otherCosts ? JSON.stringify(request.otherCosts) : '[]'
    }
  }

  const coLeaders = data.leaders.map(db.getUserByEmail).map(user => user.id)
  const allLeaders = [...coLeaders, creator.id]
  const trip_required_gear = data.trippeeGear || []
  const group_gear_requests = data.gearRequests || []
  const tripId = db.insertTrip(trip, allLeaders, trip_required_gear, group_gear_requests, pcard_request)

  const leaderEmails = [creator.email] // Used to send out initial email
  const savedTrip = { ...trip, id: tripId, _id: tripId }
  await mailer.sendNewTripEmail(savedTrip, leaderEmails, creator)

  // If vehciles are specified, create a new Vehicle Request
  if (data.vehicles.length > 0) {
    const vehicleRequest = {
      requester: creator.id,
      request_details: data.description,
      trip: tripId,
      mileage: null,
      request_type: 'TRIP'
    }
    if (data.mileage) vehicleRequest.mileage = data.mileage

    const requestedVehicles = data.vehicles.map((vehicle) => ({
      type: vehicle.vehicleType,
      details: vehicle.vehicleDetails,
      trailer_needed: vehicle.trailerNeeded ? 1 : 0,
      pass_needed: vehicle.passNeeded ? 1 : 0,
      pickup_time: constants.createIntegerDateObject(vehicle.pickupDate, vehicle.pickupTime),
      return_time: constants.createIntegerDateObject(vehicle.returnDate, vehicle.returnTime)
    }))

    try {
      const vehicleRequestId = db.createVehicleRequestForTrip(vehicleRequest, requestedVehicles)
      await mailer.sendNewVehicleRequestEmail(trip, leaderEmails, vehicleRequestId)

      return db.getTripById(tripId)
    } catch (error) {
      console.error('Trip successfully created, but error creating associated vehicle request for trip', error)
      return savedTrip
    }
  } else {
    return savedTrip
  }
}

export async function updateTrip (req, res) {
  const trip = db.getTripById(req.params.tripID)
  const isOwner = trip.owner.id === req.user.id
  const isLeader = trip.leaders.some(user => user.id === req.user.id)
  const isOPO = req.user.role === 'OPO'
  if (!isOwner && !isLeader && !isOPO) {
    return res.status(403).send('You must be a leader on the trip to update it.')
  }
  const newTrip = {
    id: trip.id,
    title: req.body.title,
    private: req.body.private,
    returned: req.body.returned,
    start_time: constants.createIntegerDateObject(req.body.startDate, req.body.startTime),
    end_time: constants.createIntegerDateObject(req.body.endDate, req.body.endTime),
    description: req.body.description,
    coleader_can_edit: req.body.coLeaderCanEditTrip,
    club: req.body.club._id,
    location: req.body.location,
    pickup: req.body.pickup,
    dropoff: req.body.dropoff,
    cost: req.body.cost,
    experience_needed: req.body.experienceNeeded
  }

  if (req.body.changedVehicles) {
    const { vehicleReqId, mileage, noOfPeople } = req.body
    const vehicleRequest = {
      id: vehicleReqId,
      requester: req.user._id,
      request_details: req.body.description,
      mileage,
      num_participants: noOfPeople,
      trip: req.params.tripID,
      request_type: 'TRIP',
      status: 'pending'
    }
    const vehicles = req.body.vehicles?.map(vehicle => {
      return {
        // You're not *really* supposed to use Date.parse but it's a hack that works here
        pickup_time: Date.parse(`${vehicle.pickupDate} ${vehicle.pickupTime}`),
        return_time: Date.parse(`${vehicle.returnDate} ${vehicle.returnTime}`),
        details: vehicle.vehicleDetails,
        type: vehicle.vehicleType,
        pass_needed: vehicle.passNeeded ? 1 : 0,
        trailer_needed: vehicle.trailerNeeded ? 1 : 0
      }
    })
    if (trip.vehicleStatus === 'N/A' && vehicles.length > 0) {
      db.createVehicleRequestForTrip(vehicleRequest, vehicles)
    } else {
      // If the request was previously approved, delete associated assignements and send an email
      if (trip.vehicleStatus === 'approved') {
        const info = db.deleteAllAssignmentsForVehicleRequest(vehicleReqId)
        if (info.changes > 0) await mailer.sendVehicleRequestChangedEmail(vehicleRequest)
      }

      // If there are no requests, delete the request entirely, otherwise update it
      if (vehicles.length === 0) {
        db.deleteVehicleRequest(vehicleReqId)
      } else {
        db.updateVehicleRequest(vehicleRequest, vehicles)
      }
    }
  }

  const { leaders } = req.body
  const newLeaders = leaders.map(db.getUserByEmail).map(user => user.id)
  if (trip.leaders.length < 1) {
    console.error(`ERROR: attempted to save a trip without a leader for trip ${req.params.tripID}`)
    return res.status(400).send('Cannot save trip with no leader')
  }
  db.replaceTripLeaders(trip.id, newLeaders)

  let pcard_request
  if (req.body.pcard?.at(0)) {
    const request = req.body.pcard?.at(0)
    pcard_request = {
      snacks: request.snacks,
      breakfast: request.breakfast,
      lunch: request.lunch,
      dinner: request.dinner,
      num_people: request.numPeople,
      other_costs: request.otherCosts ? JSON.stringify(request.otherCosts) : '[]'
    }
  }

  const trip_required_gear = req.body.trippeeGear || []
  const group_gear_requests = req.body.gearRequests || []
  db.updateTrip(newTrip, trip_required_gear, group_gear_requests, pcard_request)
  return res.json(db.getTripById(trip.id))
}

/**
 * Deletes a trip.
 */
export async function deleteTrip (req, res) {
  const tripId = req.params.tripID
  const trip = db.getTripById(tripId)

  const isLeader = trip.leaders.some(leader => leader.id === req.user.id)
  const isOpo = req.user.role === 'OPO'
  if (!isLeader && !isOpo) {
    return res.status(422).send('You must be a leader on the trip or OPO staff')
  }

  db.deleteTrip(trip.id)

  const members = [...trip.members, ...trip.pending]
  const trippeeIds = members.map(member => member.user.id)
  const trippeeEmails = db.getUserEmails(trippeeIds)
  mailer.sendTripDeletedEmail(trip, trip.owner.email, trippeeEmails, req.body.reason)
    .catch(err => {
      console.error(`Failed to send Trip Deleted Email for trip ${trip._id}`, err)
    })

  const vehicleRequest = db.getVehicleRequestByTripId(trip.id)
  if (vehicleRequest) {
    const request = VehicleRequests.deleteOne(trip.vehicleRequest, 'Associated trip has been deleted')
    await mailer.sendTripVehicleRequestDeletedEmail(trip, [trip.owner.email], request.number)
    return res.json({ message: 'Trip and associated vehicle request successfully' })
  } else {
    return res.json({ message: 'Trip removed successfully' })
  }
}

/**
 * TRIP GEAR
 */

// Send an email and set approval to pending if gear was previously approved, and then changed
function resetGearApproval (trip) {
  if (trip.trippee_gear_status === 1) {
    db.setTripIndividualGearStatus(trip.id, null)
    const leaderEmails = db.getTripLeaderEmails(trip.id)
    mailer.sendTripGearChangedNotice(trip, leaderEmails)
    mailer.sendGearRequiresReapprovalNotice(trip)
  }
}

/**
 * Allows a user - both pending and approved - to edit their gear requests.
 */
export async function editUserGear (req, res) {
  const tripId = req.params.tripID
  const userId = req.user.id
  const { trippeeGear } = req.body
  const trip = db.getTripById(tripId)
  const tripMember = db.getTripMember(tripId, userId)

  db.updateTripMemberGearRequest(tripId, userId, trippeeGear)

  // If the member was on the trip, reset the gear approval
  if (!tripMember.pending) {
    resetGearApproval(trip)
  }
  return res.json(db.getFullTripView(tripId, req.params.user))
}

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {String} tripId
 * @param {String} userId
 * @param {} requested_gear
 */
export async function apply (req, res) {
  const tripId = req.params.tripID
  const userId = req.user.id
  const trippeeGear = req.body.trippeeGear

  const tripMember = db.getTripMember(tripId, userId)
  if (tripMember) throw new Error(`User ${userId} is already on the trip`)
  db.insertPendingTripMember(tripId, userId, trippeeGear)

  const trip = db.getTripById(tripId)
  const newMember = db.getUserById(userId)
  mailer.sendTripApplicationConfirmation(trip, newMember, trip.owner.email)
  return res.json(trip)
}

/**
 * Moves a pending member to the approved list, while adding their gear requests to the trip's
 * total.
 * Sends approved notification email to the trippee and a notice to all leaders and co-leaders.
 * @param {String} tripId The ID of the trip to join
 * @param {String} userId The user ID who is requesting to join
 */
export async function admit (tripId, userId) {
  // Admit user
  const tripMember = db.getTripMember(tripId, userId)
  if (!tripMember) throw new Error('This user is not yet on the pending list for this trip')
  if (!tripMember.pending) throw new Error('This user is already approved to be on the trip')
  db.admitTripMember(tripId, userId)

  // Update trippee gear if the admitted user requsted anything
  const trip = db.getTripById(tripId)
  const numberOfGearRequests = db.getMemberGearRequests(tripId, userId)?.length
  if (numberOfGearRequests > 0) resetGearApproval(trip)

  // Send approval email to user
  const member = db.getUserById(userId)
  return mailer.sendTripApprovalEmail(trip, member, trip.owner.email)
}

/**
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripId The ID of the trip to leave
 * @param {String} userId The user ID who is leaving
 */
export async function unadmit (tripId, userId) {
  // Remove user from trip
  const tripMember = db.getTripMember(tripId, userId)
  if (!tripMember) throw new Error('This user was not on the trip before')
  if (tripMember.pending) throw new Error('This user was already on the pending list')
  if (tripMember.is_owner) throw new Error('You cannot unadmit the owner of the trip')
  db.unadmitTripMember(tripId, userId)

  // Inform user of their removal
  const trip = db.getTripById(tripId)
  const user = db.getUserById(userId)
  return mailer.sendTripRemovalEmail(trip, user, trip.owner.email)
}

/**
 * Removes a currently pending trippee.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripId The ID of the trip to leave
 * @param {String} userId The user ID who is leaving
 */
export async function reject (tripId, userId) {
  const tripMember = db.getTripMember(tripId, userId)
  if (!tripMember) throw new Error('This user was not on the trip before')
  db.deleteTripMember(tripId, userId)

  const trip = db.getTripById(tripId)
  const user = db.getUserById(userId)
  return mailer.sendTripTooFullEmail(trip, user, trip.owner.email)
}

/**
 * Processes request from trippee to leave trip.
 * If the trippee was approved, removes all gear requested by trippee in the group list and sends email alert to all trip leaders and co-leaders.
 * @param {String} tripId The ID of the trip to leave from
 * @param {String} leavingUserID The ID of the user leaving
 */
export async function leave (tripId, userId) {
  const trip = db.getTripById(tripId)

  const tripMember = db.getTripMember(tripId, userId)
  db.deleteTripMember(tripId, userId)
  if (!tripMember.pending) {
    const leaderEmails = db.getTripLeaderEmails(tripId)
    const leavingUser = db.getUserById(userId)
    mailer.sendUserLeftEmail(trip, leaderEmails, leavingUser)
  }
}

export async function toggleTripLeadership (req, res) {
  const tripId = req.params.tripID
  const userId = req.body.member.user.id

  const trip = db.getTripById(tripId)
  const user = db.getUserById(userId)
  const tripMember = db.getTripMember(tripId, userId)
  if (tripMember.is_owner) throw new Error('You cannot remove the owner of the trip from leadership')

  if (tripMember.leader === 1) {
    db.demoteTripLeaderToMember(tripId, userId)
    mailer.sendCoLeaderRemovalNotice(trip, user)
  } else {
    db.promoteTripMemberToLeader(tripId, userId)
    mailer.sendCoLeaderConfirmation(trip, user)
  }

  const newTrip = db.getFullTripView(tripId, user)
  return res.json(newTrip)
}

/**
 * Sets the attending status for each member of trip.
 */
export async function setMemberAttendance (req, res) {
  const { tripID } = req.params
  const { memberID, status } = req.body
  db.setTripMemberAttendance(tripID, memberID, status)
  res.json({ status })
}

/**
 * TRIP STATUS
 */

/**
 * Sets the returned status for the trip.
 */
export async function toggleTripLeftStatus (req, res) {
  const tripId = req.params.tripID
  const left = req.body.status
  const now = new Date()

  db.setTripLeftStatus(tripId, left)
  const trip = db.getTripById(tripId)

  if (left) {
    // These do not toggle back - unclear if that was intentional
    db.markTripVehicleAssignmentsPickedUp(tripId)
  }

  sendLeadersEmail(trip._id, `Trip #${trip.number} ${!left ? 'un-' : ''}left`, `Hello,\n\nYou have marked your Trip #${trip.number}: ${trip.title} as just having ${!left ? 'NOT ' : ''}left ${trip.pickup} at ${constants.formatDateAndTime(now)}, and your trip is due for return at ${constants.formatDateAndTime(trip.endDateAndTime)}.\n\nIMPORTANT: within 90 minutes of returning from this trip, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${Users.tokenForUser(req.user._id, 'mobile', trip._id)}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)

  const newTrip = db.getFullTripView(tripId, req.params.user)
  res.json(newTrip)
}

/**
 * Sets the returned status for the trip.
 */
export async function toggleTripReturnedStatus (req, res) {
  const tripId = req.params.tripID
  const now = new Date()

  const returned = req.body.status === true ? 1 : 0
  db.setTripReturnedStatus(tripId, returned)

  if (returned) {
    // These do not toggle back - unclear if that was intentional
    db.markTripVehicleAssignmentsReturned(tripId)
  }

  const trip = db.getTripById(tripId)
  sendLeadersEmail(trip._id, `Trip #${trip.number} ${!returned ? 'un-' : ''}returned`, `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, has been marked as ${!returned ? 'NOT ' : ''}returned at ${constants.formatDateAndTime(now)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)

  // Inform OPO that the trip has been returned if it had been marked as late (3 hr) before
  if (trip.marked_late) {
    mailer.sendLateTripBackAnnouncement(trip, returned, now)
  }

  const newTrip = db.getFullTripView(tripId, req.params.user)
  res.json(newTrip)
}

/**
 * TRIP REQUESTS
 */

/**
 * OPO approves or denies a trip's general gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export async function respondToGearRequest (req, res) {
  const tripId = req.params.tripID

  let message
  switch (req.body.status) {
    case 'approved':
      db.approveTripGroupGear(tripId)
      message = 'got approved'
      break
    case 'denied':
      db.denyTripGroupGear(tripId)
      message = 'got denied'
      break
    case 'pending':
      db.resetTripGroupGear(tripId)
      message = 'are marked pending'
      break
    default:
      return res.sendStatus(400)
  }

  const trip = db.getFullTripView(tripId, req.params.user)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  await mailer.sendGroupGearStatusUpdate(trip.trip, leaderEmails, message)
  return res.json(trip)
}

/**
 * OPO approves or denies a trip's trippee gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export async function respondToTrippeeGearRequest (req, res) {
  const tripId = req.params.tripID

  let message
  switch (req.body.status) {
    case 'approved':
      db.approveTripIndividualGear(tripId)
      message = 'got approved'
      break
    case 'denied':
      db.denyTripIndividualGear(tripId)
      message = 'got denied'
      break
    case 'pending':
      db.resetTripIndividualGear(tripId)
      message = 'are marked pending'
      break
    default:
      return res.sendStatus(400)
  }

  const trip = db.getFullTripView(tripId, req.params.user)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  await mailer.sendIndividualGearStatusUpdate(trip.trip, leaderEmails, message)
  return res.json(trip)
}

/**
 * OPO assigns a P-Card to a trip or denies.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export async function respondToPCardRequest (req, res) {
  const tripId = req.params.tripID
  const { pcardStatus, pcardAssigned } = req.body

  let is_approved = null
  if (pcardStatus === 'approved') is_approved = 1
  if (pcardStatus === 'denied') is_approved = 0

  db.setTripPcardStatus(tripId, is_approved, pcardAssigned)

  const trip = db.getFullTripView(tripId, req.params.user)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  mailer.sendPCardStatusUpdate(trip.trip, leaderEmails)
  return res.json(trip)
}
