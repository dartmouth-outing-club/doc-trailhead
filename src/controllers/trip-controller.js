import { subtract } from 'date-arithmetic'
import { ObjectId } from 'mongodb'

import { trips } from '../services/mongo.js'

import * as Globals from '../controllers/global-controller.js'
import * as Users from '../controllers/user-controller.js'
import * as Clubs from '../controllers/club-controller.js'
import * as VehicleRequests from './vehicle-request-controller.js'
import * as Assignments from './assignment-controller.js'

import * as constants from '../constants.js'
import * as mailer from '../services/mailer.js'
import * as utils from '../utils.js'
import { logError } from '../services/error.js'

export async function getTripById (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return trips.findOne({ _id })
}

export async function markVehicleStatusApproved (_id) {
  return trips.updateOne({ _id }, { $set: { vehicleStatus: 'approved' } })
}

export async function markVehicleStatusDenied (_id) {
  return trips.updateOne({ _id }, { $set: { vehicleStatus: 'denied' } })
}

export async function getAllCurrentTrips () {
  const now = new Date()
  return trips.find({ endDateAndTime: { $gt: now } }).toArray()
}

export async function getTripsWithUser (userId) {
  const pastAndPresentTrips = await trips.find({ endDateAndTime: { $gte: subtract(new Date(), 30, 'day') } }).toArray()
  const userTrips = pastAndPresentTrips.filter((trip) => {
    const isLeader = trip.leaders.some(leader => leader.toString() === userId)
    const isMember = trip.members.some(member => member.user.toString() === userId)
    const isPending = trip.pending.some(member => member.user.toString() === userId)
    return isLeader || isMember || isPending
  })

  return userTrips
}

export async function markTripsAsPast () {
  const now = new Date()
  const yesterday = subtract(now, 1, 'day')
  return trips.updateMany({ $set: { startDateAndTime: { $lt: yesterday } } }, { past: true })
}

async function sendLeadersEmail (tripID, subject, message) {
  const trip = await getTripById(tripID)
  const leaderEmails = await Users.getUserEmails(trip.leaders)
  mailer.send({ address: leaderEmails, subject, message })
}

export async function getPublicTrips (_req, res) {
  const clubsPromise = Clubs.getClubsMap()
  const tripsPromise = trips
    .find({ startDateAndTime: { $gte: new Date() }, private: false })
    .sort({ startDateAndTime: 1 })
    .limit(15)
    .toArray()

  try {
    const [tripsList, clubsMap] = await Promise.all([tripsPromise, clubsPromise])

    const filteredList = tripsList
      .map((trip) => (
        utils.pick(trip, ['location', 'club', 'title', 'description', 'startDateAndTime', 'endDateAndTime'])
      ))
      .map((trip) => ({ ...trip, club: clubsMap[trip.club] }))

    return res.json(filteredList)
  } catch (error) {
    console.error(error)
    logError({ type: 'fetchPublicTrips', message: error.message })
    return res.status(500).send(error.message)
  }
}

export async function getTrips (getPastTrips) {
  const date = getPastTrips ? subtract(new Date(), 30, 'day') : new Date()
  const tripsPromise = trips.find({ startDateAndTime: { $gte: date } }).toArray()
  const clubsPromise = Clubs.getClubsMap()

  const [allTrips, clubsMap] = await Promise.all([tripsPromise, clubsPromise])
  const owners = allTrips.map(trip => trip.owner)
  const leaders = await Users.getUsersById(owners)
  allTrips.forEach(trip => { trip.club = clubsMap[trip.club] })
  allTrips.forEach(trip => {
    trip.owner = leaders.find(user => user._id.toString() === trip.owner.toString())
  })

  return allTrips
}

/**
 * Fetches only trips that have gear, P-Card, or vehicle requests.
 */
export async function handleGetOpoTrips (req, res) {
  const getPastTrips = req.query.getOldTrips !== 'false'
  const allTrips = await getTrips(getPastTrips)
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
export async function getTrip (tripID, forUser) {
  const [trip, clubsMap] = await Promise.all([getTripById(tripID), Clubs.getClubsMap()])

  const trippeeIds = [...trip.members, ...trip.pending].map(trippee => trippee.user)
  const allUserIds = [trip.owner, ...trip.leaders, ...trippeeIds]

  const allUsers = await Users.getUsersById(allUserIds)
  const userMap = allUsers.reduce((map, user) => {
    map[user._id.toString()] = user
    return map
  }, {})

  let userTripStatus
  let isLeaderOnTrip
  if (forUser) {
    const isPending = trip.pending.some(pender => pender.toString() === forUser._id.toString())
    const isOnTrip = trip.members.some(member => member.toString() === forUser._id.toString())

    if (isPending) {
      userTripStatus = 'PENDING'
    } else if (isOnTrip) {
      userTripStatus = 'APPROVED'
    } else {
      userTripStatus = 'NONE'
    }

    if (forUser.role === 'OPO') {
      isLeaderOnTrip = true
    } else if (trip.coLeaderCanEditTrip) {
      isLeaderOnTrip = trip.leaders.some(leader => leader.toString() === forUser._id.toString())
    } else {
      isLeaderOnTrip = trip.owner.toString() === forUser._id.toString()
    }
  }

  let vehicleRequest = trip.vehicleRequest
  if (trip.vehicleRequest) {
    vehicleRequest = await VehicleRequests.getVehicleRequestById(trip.vehicleRequest)
  }

  const club = clubsMap[trip.club]
  const members = trip.members.map(member => ({ ...member, user: userMap[member.user] }))
  const pending = trip.pending.map(pender => ({ ...pender, user: userMap[pender.user] }))
  const leaders = trip.leaders.map(leader => (userMap[leader]))
  const owner = userMap[trip.owner]

  const enhancedTrip = { ...trip, members, pending, leaders, owner, club, vehicleRequest }
  return { trip: enhancedTrip, userTripStatus, isLeaderOnTrip }
}

export async function createTrip (creator, data) {
  const nextTripNumber = await Globals.incrementTripNumber()

  // Creates the new trip
  const startDateAndTime = constants.createDateObject(data.startDate, data.startTime, data.timezone)
  const endDateAndTime = constants.createDateObject(data.endDate, data.endTime, data.timezone)
  const trip = {
    number: nextTripNumber,
    title: data.title || 'Untitled trip',
    private: data.private || false,
    past: false,
    left: false,
    returnd: false,
    markedLate: false,
    startDate: data.startDate,
    endDate: data.endDate,
    startTime: data.startTime,
    startDateAndTime,
    endDateAndTime,
    endTime: data.endTime,
    description: data.description,
    club: data.club._id,
    cost: data.cost || 0,
    experienceNeeded: data.experienceNeeded || false,
    location: data.location,
    pickup: data.pickup,
    dropoff: data.dropoff,
    mileage: data.mileage,
    coLeaderCanEditTrip: data.coLeaderCanEditTrip || false,
    OPOGearRequests: data.gearRequests,
    trippeeGear: data.trippeeGear,
    gearStatus: 'N/A',
    trippeeGearStatus: 'N/A',
    pcard: data.pcard,
    pcardStatus: 'N/A',
    pcardAssigned: 'None',
    vehicleStatus: 'N/A',
    sentEmails: []
  }

  if (data.gearRequests.length > 0) trip.gearStatus = 'pending'
  if (data.trippeeGear.length > 0) trip.trippeeGearStatus = 'pending'
  if (data.pcard.length > 0) trip.pcardStatus = 'pending'

  // Add the trip creator to the trip
  trip.members = [{ user: creator._id, requestedGear: [] }]
  trip.owner = creator._id
  trip.leaders = [creator._id]
  trip.pending = []

  const leaderEmails = [creator.email] // Used to send out initial email
  const foundUsers = await Users.getUsersFromEmailList(data.leaders)
  foundUsers.forEach((foundUser) => {
    if (!foundUser._id.equals(creator._id)) {
      trip.leaders.push(foundUser._id)
      trip.members.push({ user: foundUser._id, requestedGear: [] })
      leaderEmails.push(foundUser.email)
    }
  })

  const { insertedId } = await trips.insertOne(trip)
  const savedTrip = { ...trip, _id: insertedId }
  await mailer.sendNewTripEmail(savedTrip, leaderEmails, creator)

  // If vehciles are specified, create a new Vehicle Request
  if (data.vehicles.length > 0) {
    const { mileage, description, vehicles } = data
    const requestObject = {
      mileage,
      associatedTrip: savedTrip._id,
      requestType: 'TRIP',
      requester: creator._id,
      requestDetails: description,
      requestedVehicles: vehicles
    }

    try {
      const savedVehicleRequest = await VehicleRequests.createNewVehicleRequest(requestObject)
      await mailer.sendNewVehicleRequestEmail(trip, leaderEmails, savedVehicleRequest)
      const vehicleStatus = 'pending'
      const vehicleRequest = savedVehicleRequest._id
      await trips.updateOne({ _id: trip._id }, { $set: { vehicleStatus, vehicleRequest } })
      return { ...savedTrip, vehicleStatus, vehicleRequest }
    } catch (error) {
      throw new Error(`${'Trip successfully created, but error creating associated vehicle request for trip:'} ${error.toString()}`)
    }
  } else {
    return savedTrip
  }
}

export async function updateTrip (req, res) {
  const trip = await getTripById(req.params.tripID)
  const isTripLeaderOrOPO = trip.leaders.some(leaderID => leaderID.toString() === req.user._id.toString()) || req.user.role === 'OPO'
  if (!isTripLeaderOrOPO) {
    return res.status(403).send('You must be a leader on the trip to update it.')
  }

  trip.title = req.body.title
  trip.private = req.body.private
  trip.startDate = req.body.startDate
  trip.endDate = req.body.endDate
  trip.startTime = req.body.startTime
  trip.endTime = req.body.endTime
  trip.startDateAndTime = constants.createDateObject(req.body.startDate, req.body.startTime, req.body.timezone)
  trip.endDateAndTime = constants.createDateObject(req.body.endDate, req.body.endTime, req.body.timezone)
  trip.description = req.body.description
  trip.coLeaderCanEditTrip = req.body.coLeaderCanEditTrip
  trip.club = req.body.club._id
  trip.location = req.body.location
  trip.pickup = req.body.pickup
  trip.dropoff = req.body.dropoff
  trip.cost = req.body.cost
  trip.experienceNeeded = req.body.experienceNeeded
  trip.OPOGearRequests = req.body.gearRequests
  trip.trippeeGear = req.body.trippeeGear
  trip.pcard = req.body.pcard
  trip.returned = req.body.returned

  /**
   * Updates each member's gear requests based on the new gear.
   */
  trip.members.concat(trip.pending).forEach((person) => {
    const markToRemove = []
    person.requestedGear.forEach((gear, idx) => {
      let found = false
      trip.trippeeGear.forEach((newGear) => {
        if (gear.gearId === newGear._id.toString()) {
          gear.gearId = newGear._id
          found = true
        }
      })
      if (!found) {
        markToRemove.push(idx)
      }
    })
    for (let i = 0; i < markToRemove.length; i += 1) person.requestedGear.splice(markToRemove[i], 1)
  })

  const { trippeeGear, trippeeGearStatus } = getNewGearAndGearStatus(trip)
  trip.trippeeGear = trippeeGear
  trip.trippeeGearStatus = trippeeGearStatus

  if (trip.gearStatus === 'N/A' && req.body.gearRequests.length > 0) {
    trip.gearStatus = 'pending'
  }

  if (trip.gearStatus === 'pending' && req.body.gearRequests.length === 0) {
    trip.gearStatus = 'N/A'
  }

  if (trip.trippeeGearStatus === 'N/A' && req.body.trippeeGear.length > 0) {
    trip.trippeeGearStatus = 'pending'
  }
  if (trip.trippeeGearStatus === 'pending' && req.body.trippeeGear.length === 0) {
    trip.trippeeGearStatus = 'N/A'
  }

  if (trip.pcardStatus === 'N/A' && req.body.pcard.length > 0) {
    trip.pcardStatus = 'pending'
  }
  if (trip.pcardStatus === 'pending' && req.body.pcard.length === 0) {
    trip.pcardStatus = 'N/A'
  }

  if (req.body.changedVehicles) {
    const { vehicleReqId, mileage, noOfPeople, timezone } = req.body
    const requestObject = {
      _id: vehicleReqId,
      mileage,
      noOfPeople,
      timezone,
      requestDetails: req.body.description,
      requester: req.user._id,
      associatedTrip: new ObjectId(req.params.tripID),
      assignments: [],
      requestType: 'TRIP',
      status: 'pending',
      requestedVehicles: req.body.vehicles
    }

    if (trip.vehicleStatus === 'N/A' && req.body.vehicles.length > 0) {
      const vehicleRequest = await VehicleRequests.createNewVehicleRequest(requestObject)
      trip.vehicleRequest = vehicleRequest._id
      trip.vehicleStatus = 'pending'
    } else {
      // If the request was previously approved, delete associated assignements and send an email
      if (trip.vehicleStatus === 'approved') {
        const vehicleRequest = await VehicleRequests.getVehicleRequestById(req.body.vehicleReqId)
        await Assignments.deleteAssignments(vehicleRequest.assignments)
        if (vehicleRequest.assignments) await mailer.sendVehicleRequestChangedEmail(vehicleRequest)
      }

      // If there are no requests, delete the request entirely, otherwise update and set to pending
      if (req.body.vehicles.length === 0) {
        await VehicleRequests.deleteOne(req.body.vehicleReqId)
        trip.vehicleStatus = 'N/A'
      } else {
        await VehicleRequests.updateVehicleRequest(requestObject)
        trip.vehicleStatus = 'pending'
      }
    }
  }

  const coleaders = await Users.getUsersFromEmailList(req.body.leaders)
  trip.leaders = coleaders.map(user => user._id)
  if (trip.leaders.length < 1) {
    console.warn(`WARNING: saving a trip without a leader for trip ${req.params.tripID}`)
    console.warn(req.body)
  }

  // The updateTrip method is responsible for adding trip leaders as members
  // This is very silly! It duplicates the data inside the object
  trip.leaders.forEach((leaderId) => {
    const containsLeader = trip.members.some(member => member.user.toString() === leaderId.toString())
    if (!containsLeader) {
      trip.members.push({ user: leaderId, requestedGear: [] })
    }
  })

  const updateResponse = await trips.findOneAndUpdate({ _id: trip._id }, { $set: { ...trip } })
  return res.json(updateResponse.value)
}

/**
 * Deletes a trip.
 */
export async function deleteTrip (req, res) {
  const userId = req.user._id
  const tripId = req.params.tripID
  const trip = await getTripById(tripId)

  const isLeader = trip.leaders.some(leader => leader.toString() === userId.toString())
  const isOpo = req.user.role === 'OPO'
  if (!isLeader && !isOpo) {
    return res.status(422).send('You must be a leader on the trip or OPO staff')
  }

  await trips.deleteOne({ _id: new ObjectId(tripId) })
  const owner = await Users.getUserById(trip.owner)

  const members = [...trip.members, ...trip.pending]
  const trippeeEmails = await Users.getUserEmails(members)
  mailer.sendTripDeletedEmail(trip, owner.email, trippeeEmails, req.body.reason)
    .catch(err => {
      console.error(`Failed to send Trip Deleted Email for trip ${trip._id}`, err)
    })

  if (trip.vehicleRequest) {
    const request = await VehicleRequests.deleteOne(trip.vehicleRequest, 'Associated trip has been deleted')
    await mailer.sendTripVehicleRequestDeletedEmail(trip, [owner.email], request.number)
    return res.json({ message: 'Trip and associated vehicle request successfully' })
  } else {
    return res.json({ message: 'Trip removed successfully' })
  }
}

/**
 * TRIP GEAR
 */

function getNewGearAndGearStatus (trip) {
  const newGear = trip.trippeeGear.map((gear) => {
    let quantity = 0
    for (const member in trip.members) {
      for (const memberGearRequest in member.requestedGear) {
        if (memberGearRequest.gearId === gear._id.toString(0)) quantity += 1
      }
    }
    return { ...gear, quantity }
  })

  // This is a copied bit that I still don't like. This whole way of doing gear is a little fucked
  const wasApproved = trip.trippeeGearStatus === 'approved'
  const hasChanged = trip.trippeeGear.length !== newGear.length ||
    !trip.trippeeGear
      .map((o, i) => [o, trip.trippeeGear[i]])
      .every((combined) => (combined[0].name === combined[1].name && combined[0].quantity >= combined[1].quantity && combined[0].sizeType === combined[1].sizeType))

  let trippeeGearStatus = trip.trippeeGearStatus
  if (wasApproved && hasChanged) {
    trippeeGearStatus = 'pending'
    sendLeadersEmail(trip._id, `Trip #${trip.number}: Trippee gear requests un-approved`, `Hello,\n\nYour [Trip #${trip.number}: ${trip.title}]'s trippee (not group) gear requests was originally approved by OPO staff, but since a new trippee was admitted who requested additional gear, it has automatically been sent back to review to OPO staff to ensure we have enough.\nCurrently, your trip's status has been changed back to pending, and you should await re-approval before heading out.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
    mailer.sendGearRequiresReapprovalNotice(trip)
  }

  return { trippeeGear: newGear, trippeeGearStatus }
}

/**
 * Allows a user - both pending and approved - to edit their gear requests.
 */
export async function editUserGear (req, res) {
  const tripId = req.params.tripID
  const requestedGear = req.body.trippeeGear
  const trip = await getTripById(tripId)

  const isOnTrip = trip.members.some(member => member.user.toString() === req.user._id.toString())
  const newTrip = {}
  if (isOnTrip) {
    const members = trip.members.map(member => {
      if (member.user._id.toString() === req.user._id.toString()) {
        return { ...member, requestedGear }
      } else {
        return member
      }
    })

    newTrip.members = members
    const user = await Users.getUserById(req.user._id)
    const leaderEmails = await Users.getUserEmails(trip.leaders)
    mailer.sendGearRequestChangedEmail(trip, leaderEmails, user)
  } else {
    const pending = trip.pending.map(pender => {
      if (pender.user._id.toString() === req.user._id.toString()) {
        return { ...pender, requestedGear }
      } else {
        return pender
      }
    })
    newTrip.pending = pending
  }

  const { trippeeGear, trippeeGearStatus } = getNewGearAndGearStatus(trip)
  newTrip.trippeeGear = trippeeGear
  newTrip.trippeeGearStatus = trippeeGearStatus
  await trips.updateOne({ _id: new ObjectId(tripId) }, { $set: newTrip })
  const updatedTrip = await getTrip(tripId, req.params.user)
  return res.json(updatedTrip)
}

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {String} tripID
 * @param {String} joiningUserID
 * @param {} requestedGear
 */
export async function apply (tripID, joiningUserID, requestedGear) {
  const trip = await getTripById(tripID)
  const isOnTrip = trip.pending.some(pender => pender.user.toString() === joiningUserID.toString())
  if (!isOnTrip) {
    const newPending = [...trip.pending, { user: joiningUserID, requestedGear }]
    trips.updateOne({ _id: new ObjectId(tripID) }, { $set: { pending: newPending } })
    const newTrippeePromise = Users.getUserById(joiningUserID)
    const ownerPromise = Users.getUserById(trip.owner)
    const [newTrippee, owner] = await Promise.all([newTrippeePromise, ownerPromise])
    mailer.sendTripApplicationConfirmation(trip, newTrippee, owner.email)
  }
}

/**
 * Moves a pending member to the approved list, while adding their gear requests to the trip's total.
 * Sends approved notification email to the trippee and a notice to all leaders and co-leaders.
 * @param {String} tripID The ID of the trip to join
 * @param {String} admittedUserID The user ID who is requesting to join
 */
export async function admit (tripID, admittedUserID) {
  const trip = await getTripById(tripID)

  // Remove user from pending list
  const joiningUser = trip.pending.find(pender => pender.user?.toString() === admittedUserID)
  if (!joiningUser) throw new Error('This user is not yet on the pending list for this trip')

  // Add user to member list
  const pending = trip.pending.filter(pender => pender.user?.toString() !== admittedUserID)
  const isMember = trip.members.includes(member => member.user?.toString() === admittedUserID)
  if (isMember) throw new Error('This user is already approved to be on the trip')
  const members = [...trip.members, joiningUser]

  const { trippeeGear, trippeeGearStatus } = getNewGearAndGearStatus(trip)
  await trips.updateOne(
    { _id: new ObjectId(tripID) },
    { $set: { pending, members, trippeeGear, trippeeGearStatus } }
  )
  const foundUser = await Users.getUserById(admittedUserID)
  const owner = await Users.getUserById(trip.owner)
  console.log(owner)
  return mailer.sendTripApprovalEmail(trip, foundUser, owner.email)
}

/**
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripID The ID of the trip to leave
 * @param {String} leavinUserID The user ID who is leaving
 */
export async function unAdmit (tripID, leavingUserID) {
  const trip = await getTripById(tripID)

  const leavingUser = trip.members.find(member => member.user?.toString() === leavingUserID)
  if (!leavingUser) throw new Error('This user was not on the approved list before')

  const members = trip.members.filter(member => member.user?.toString() !== leavingUserID)
  const leaders = trip.leaders.filter(leader => leader.toString() !== leavingUserID)

  const pending = [...trip.pending, leavingUser]
  const { trippeeGear, trippeeGearStatus } = getNewGearAndGearStatus(trip)
  await trips.updateOne(
    { _id: new ObjectId(tripID) },
    { $set: { pending, members, leaders, trippeeGear, trippeeGearStatus } }
  )
  const foundUser = await Users.getUserById(leavingUserID)
  const owner = await Users.getUserById(trip.owner)
  return mailer.sendTripRemovalEmail(trip, foundUser, owner.email)
}

/**
 * Removes a currently pending trippee.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripID The ID of the trip to leave
 * @param {String} rejectedUserID The user ID who is leaving
 */
export async function reject (tripID, rejectedUserID) {
  const trip = await getTripById(tripID)

  const wasOnWaitlist = trip.pending.some(pender => pender.user?.toString() === rejectedUserID)
  if (!wasOnWaitlist) throw new Error('This user was not on the waitlist')

  const pending = trip.pending.filter(pender => pender.user?.toString() !== rejectedUserID)
  await trips.updateOne({ _id: new ObjectId(tripID) }, { $set: { pending } })
  const rejectedUser = await Users.getUserById(rejectedUserID)
  const owner = await Users.getUserById(trip.owner)
  return mailer.sendTripTooFullEmail(trip, rejectedUser, owner.email)
}

/**
 * Processes request from trippee to leave trip.
 * If the trippee was approved, removes all gear requested by trippee in the group list and sends email alert to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to leave from
 * @param {String} leavingUserID The ID of the user leaving
 */
export async function leave (tripID, leavingUserID) {
  const trip = await getTripById(tripID)

  // If user is in the list of pending tripees, remove them
  const pending = trip.pending.filter(tripee => tripee.user?.toString() !== leavingUserID)

  // If user is in the list of accepted tripees, remove them
  // Should be mutually exclusive with pending tripees, but you never know
  const member = trip.members.find((tripee) => tripee.user?.toString() === leavingUserID)
  if (member) {
    const leaderEmails = await Users.getUserEmails(trip.leaders)
    const leavingUser = await Users.getUserById(leavingUserID)
    mailer.sendUserLeftEmail(trip, leaderEmails, leavingUser)
  }
  const members = trip.members.filter((tripee) => tripee.user?.toString() !== leavingUserID)

  const { trippeeGear, trippeeGearStatus } = getNewGearAndGearStatus(trip)
  return trips.updateOne(
    { _id: new ObjectId(tripID) },
    { $set: { pending, members, trippeeGear, trippeeGearStatus } }
  )
}

export async function toggleTripLeadership (req, res) {
  const tripId = req.params.tripID
  const toggledUser = await Users.getUserById(req.body.member.user._id)
  const trip = await getTripById(tripId)

  let leaders
  const isAlreadyLeader = trip.leaders.some(leader => toggledUser._id.toString() === leader.toString())
  if (isAlreadyLeader) {
    mailer.sendCoLeaderRemovalNotice(trip, req.body.member.user)
    leaders = trip.leaders.filter(leader => toggledUser._id.toString() !== leader.toString())
  } else {
    const member = trip.members.find(member => member.user._id.toString() === toggledUser._id.toString())
    mailer.sendCoLeaderConfirmation(trip, req.body.member.user)
    leaders = [...trip.leaders, member.user]
  }

  await trips.updateOne({ _id: new ObjectId(tripId) }, { $set: { leaders } })
  const newTrip = await getTrip(tripId, req.params.user)
  return res.json(newTrip)
}

/**
 * Sets the attending status for each member of trip.
 */
export async function setMemberAttendance (req, res) {
  const { tripID } = req.params
  const { memberID, status } = req.body

  const trip = await getTripById(tripID)

  const members = trip.members.map(member => (
    member.user.toString() === memberID
      ? { ...member, attended: status }
      : member
  ))

  await trips.updateOne({ _id: tripID }, { $set: { members } })
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
  const { status } = req.body
  const now = new Date()

  const updateResult = await trips.findOneAndUpdate({ _id: new ObjectId(tripId) }, { $set: { left: status } })
  const trip = updateResult.value

  if (trip.vehicleRequest) {
    const vehicleRequest = await VehicleRequests.getVehicleRequestById(trip.vehicleRequest)
    vehicleRequest.assignments.forEach(Assignments.markAssignmentPickedUp)
  }

  sendLeadersEmail(trip._id, `Trip #${trip.number} ${!status ? 'un-' : ''}left`, `Hello,\n\nYou have marked your Trip #${trip.number}: ${trip.title} as just having ${!status ? 'NOT ' : ''}left ${trip.pickup} at ${constants.formatDateAndTime(now)}, and your trip is due for return at ${constants.formatDateAndTime(trip.endDateAndTime)}.\n\nIMPORTANT: within 90 minutes of returning from this trip, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${Users.tokenForUser(req.user._id, 'mobile', trip._id)}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)

  const newTrip = await getTrip(tripId, req.params.user)
  res.json(newTrip)
}

/**
 * Sets the returned status for the trip.
 */
export async function toggleTripReturnedStatus (req, res) {
  const tripId = req.params.tripID
  const { status } = req.body
  const now = new Date()

  const updateResult = await trips.findOneAndUpdate({ _id: new ObjectId(tripId) }, { $set: { returned: status } })
  const trip = updateResult.value

  if (trip.vehicleRequest) {
    const vehicleRequest = await VehicleRequests.getVehicleRequestById(trip.vehicleRequest)
    vehicleRequest.assignments.forEach(Assignments.markAssignmentReturned)
  }

  sendLeadersEmail(trip._id, `Trip #${trip.number} ${!status ? 'un-' : ''}returned`, `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, has been marked as ${!status ? 'NOT ' : ''}returned at ${constants.formatDateAndTime(now)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
  if (trip.markedLate) { // will inform OPO that the trip has been returned if it had been marked as late (3 hr) before
    mailer.sendLateTripBackAnnouncement(trip, status, now)
  }

  const newTrip = await getTrip(tripId, req.params.user)
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
  const { status } = req.body

  const updateResult = await trips.findOneAndUpdate(
    { _id: new ObjectId(tripId) },
    { $set: { gearStatus: status } }
  )
  const trip = updateResult.value

  const leaderEmails = Users.getUserEmails(trip.leaders)
  let message
  switch (status) {
    case 'approved':
      message = 'got approved'
      break
    case 'denied':
      message = 'got denied'
      break
    case 'pending':
      message = 'was un-approved, pending again'
      break
    default:
      break
  }

  await mailer.sendGroupGearStatusUpdate(trip, leaderEmails, message)
  const newTrip = await getTrip(tripId, req.params.user)
  return res.json(newTrip)
}

/**
 * OPO approves or denies a trip's trippee gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export async function respondToTrippeeGearRequest (req, res) {
  const tripId = req.params.tripID
  const { status } = req.body
  const updateResult = await trips.findOneAndUpdate(
    { _id: new ObjectId(tripId) },
    { $set: { trippeeGearStatus: status } }
  )
  const trip = updateResult.value

  let message
  switch (status) {
    case 'approved':
      message = 'got approved'
      break
    case 'denied':
      message = 'got denied'
      break
    case 'pending':
      message = 'was un-approved, pending again'
      break
    default:
      break
  }

  const leaderEmails = await Users.getUserEmails(trip.leaders)
  mailer.sendIndividualGearStatusUpdate(trip, leaderEmails, message)
  const newTrip = await getTrip(tripId, req.params.user)
  return res.json(newTrip)
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

  const updateResult = await trips.findOneAndUpdate(
    { _id: new ObjectId(tripId) },
    { $set: { pcardStatus, pcardAssigned } }
  )
  const trip = updateResult.value

  const leaderEmails = await Users.getUserEmails(trip.leaders)
  mailer.sendPCardStatusUpdate(trip, leaderEmails)
  const newTrip = await getTrip(tripId, req.params.user)
  return res.json(newTrip)
}

const _48_HOURS_IN_MS = 172800000
const _2_HOURS_IN_MS = 7200000
const _90_MINS_IN_MS = 5400000
const _3_HOURS_IN_MS = 10800000

export async function getTripsPendingCheckOutEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _48_HOURS_IN_MS)
  const tripsInWindow = await trips.find({ startDateAndTime: { $lt: emailWindow, $gt: now } }).toArray()
  return tripsInWindow.filter(trip => !trip.sentEmails.includes('CHECK_OUT'))
}

export async function getTripsPendingCheckInEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _2_HOURS_IN_MS)
  const tripsInWindow = await trips.find({ endDateAndTime: { $lt: emailWindow, $gt: now } }).toArray()
  return tripsInWindow.filter(trip => !trip.sentEmails.includes('CHECK_IN'))
}

export async function getTripsPending90MinEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _90_MINS_IN_MS)
  const tripsInWindow = await trips.find({
    endDateAndTime: { $lt: returnWindow }, // The endDateAndTime is earlier than 90 minutes ago
    returned: false
  }).toArray()
  return tripsInWindow.filter(trip => !trip.sentEmails.includes('LATE_90'))
}

export async function getTripsPending3HourEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _3_HOURS_IN_MS)
  const tripsInWindow = await trips.find({
    endDateAndTime: { $lt: returnWindow }, // The endDateAndTime is earlier than 3 hours ago
    returned: false
  }).toArray()
  return tripsInWindow.filter(trip => !trip.sentEmails.includes('LATE_180'))
}

async function markEmailSent (trip, emailName) {
  try {
    const sentEmails = [...trip.sentEmails, emailName]
    return trips.updateOne({ _id: trip._id }, { $set: { sentEmails } })
  } catch (error) {
    console.error('trip:', trip)
    console.error(`Error updating email status ${emailName} for trip ${trip._id}:`, error)
  }
}

/**
 * Trips are officially marked late after 3 hours.
 */
export async function markTripLate (trip) {
  const sentEmails = [...trip.sentEmails, 'LATE_180']
  try {
    await trips.updateOne({ _id: trip._id }, { $set: { sentEmails, markedLate: true } })
  } catch (error) {
    console.error('trip:', trip)
    console.error(`Error updating marking trip ${trip._id} late:`, error)
  }
}

export const markCheckOutEmail = (trip) => markEmailSent(trip, 'CHECK_OUT')
export const markCheckInEmail = (trip) => markEmailSent(trip, 'CHECK_IN')
export const mark90MinEmail = (trip) => markEmailSent(trip, 'LATE_90')
