import { subtract } from 'date-arithmetic'
import { ObjectId } from 'mongodb'

import { trips } from '../services/mongo.js'
import Trip from '../models/trip-model.js'

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

const populateTripDocument = (tripQuery, fields) => {
  const fieldsDirectory = {
    owner: 'owner',
    club: 'club',
    leaders: 'leaders',
    vehicleRequest: 'vehicleRequest',
    membersUser: { path: 'members.user', model: 'User' },
    pendingUser: { path: 'pending.user', model: 'User' },
    vehicleRequestAssignments: { path: 'vehicleRequest', populate: { path: 'assignments', model: 'Assignment' } },
    vehicleRequestAssignmentsAssignedVehicle: { path: 'vehicleRequest', populate: { path: 'assignments', populate: { path: 'assigned_vehicle', mode: 'Vehicle' } } }
  }
  return tripQuery.populate(fields.map((field) => { return fieldsDirectory[field] }))
}

const sendLeadersEmail = (tripID, subject, message) => {
  populateTripDocument(Trip.findById(tripID), ['owner', 'leaders'])
    .then((trip) => {
      mailer.send({ address: trip.leaders.map((leader) => { return leader.email }), subject, message })
    })
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

/**
 Fetches all trips with all fields populated.
 */
export const getTrips = (filters = {}) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.find(filters), ['club', 'leaders', 'vehicleRequest', 'membersUser', 'pendingUser', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'])
      .then((trips) => {
        resolve(trips)
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * Fetches only trips that have gear, P-Card, or vehicle requests.
 */
export function handleGetOpoTrips (req, res) {
  const filters = {}
  if (req.query.getOldTrips === 'false') {
    filters.startDateAndTime = { $gte: subtract(new Date(), 30, 'day') }
  }
  populateTripDocument(Trip.find({
    $or: [
      { trippeeGearStatus: { $ne: 'N/A' } },
      { gearStatus: { $ne: 'N/A' } },
      { pcardStatus: { $ne: 'N/A' } },
      { vehicleStatus: { $ne: 'N/A' } }
    ],
    ...filters
  }), ['owner', 'leaders', 'club', 'membersUser', 'pendingUser', 'vehicleRequest', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'])
    .then((trips) => {
      res.json(trips)
    })
}

/**
 * Fetches a single trip with all fields populated.
 */
export const getTrip = (tripID, forUser) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'club', 'leaders', 'vehicleRequest', 'membersUser', 'pendingUser', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'])
      .then((trip) => {
        let userTripStatus
        let isLeaderOnTrip
        if (forUser) {
          const isPending = trip.pending.some((pender) => {
            return pender.user.equals(forUser.id)
          })

          const isOnTrip = trip.members.some((member) => {
            return member.user.id === forUser.id
          })

          if (isPending) userTripStatus = 'PENDING'
          else if (isOnTrip) userTripStatus = 'APPROVED'
          else userTripStatus = 'NONE'

          if (forUser.role === 'OPO') {
            isLeaderOnTrip = true
          } else if (trip.coLeaderCanEditTrip) {
            isLeaderOnTrip = trip.leaders.some((leader) => {
              return leader._id.equals(forUser._id)
            })
          } else {
            isLeaderOnTrip = trip.owner._id.equals(forUser._id)
          }
        }

        resolve({ trip, userTripStatus, isLeaderOnTrip })
      })
      .catch((error) => {
        reject(error)
      })
  })
}

/**
 * Creates a trip.
 * @param {User} creator The user document returned from passport.js for the user who intiated this trip
 * @param {Trip} data The trip parameters
 */
export async function createTrip (creator, data) {
  const nextTripNumber = await Globals.incrementTripNumber()

  // Creates the new trip
  const trip = new Trip()
  trip.number = nextTripNumber
  trip.title = data.title
  trip.private = data.private
  trip.startDate = data.startDate
  trip.endDate = data.endDate
  trip.startTime = data.startTime
  trip.startDateAndTime = constants.createDateObject(data.startDate, data.startTime, data.timezone)
  trip.endDateAndTime = constants.createDateObject(data.endDate, data.endTime, data.timezone)
  trip.endTime = data.endTime
  trip.description = data.description
  trip.club = data.club
  trip.cost = data.cost
  trip.experienceNeeded = data.experienceNeeded
  trip.location = data.location
  trip.pickup = data.pickup
  trip.dropoff = data.dropoff
  trip.mileage = data.mileage
  trip.coLeaderCanEditTrip = data.coLeaderCanEditTrip
  trip.OPOGearRequests = data.gearRequests
  trip.trippeeGear = data.trippeeGear
  trip.pcard = data.pcard

  if (data.injectingStatus) { // TO-DELETE was used for debugging
    trip.gearStatus = data.gearStatus
    trip.trippeeGearStatus = data.trippeeGearStatus
    trip.pcardStatus = data.pcardStatus
    if (data.pcardStatus === 'approved') trip.pcardAssigned = data.pcardAssigned
  } else {
    if (data.gearRequests.length > 0) trip.gearStatus = 'pending'
    if (data.trippeeGear.length > 0) trip.trippeeGearStatus = 'pending'
    if (data.pcard.length > 0) trip.pcardStatus = 'pending'
  }

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
  const savedTrip = await trip.save()
  await mailer.sendNewTripEmail(savedTrip, leaderEmails, creator)

  // If vehciles are specified, create a new Vehicle Request
  if (data.vehicles.length > 0) {
    const { mileage, description, vehicles } = data
    const requestObject = {
      mileage,
      associatedTrips: savedTrip._id,
      requestType: 'TRIP',
      requester: creator._id,
      requestDetails: description,
      requestedVehicles: vehicles
    }
    try {
      const savedVehicleRequest = await VehicleRequests.createNewVehicleRequest(requestObject)
      await mailer.sendNewVehicleRequestEmail(trip, leaderEmails, savedVehicleRequest)
      savedTrip.vehicleStatus = data.injectingStatus ? data.vehicleStatus : 'pending'
      savedTrip.vehicleRequest = savedVehicleRequest._id
      return await savedTrip.save()
    } catch (error) {
      throw new Error(`${'Trip successfully created, but error creating associated vehicle request for trip:'} ${error.toString()}`)
    }
  } else {
    return savedTrip
  }
}

export async function updateTrip (req, res) {
  const trip = await Trip.findById(req.params.tripID)
  const isTripLeaderOrOPO = trip.leaders.some((leaderID) => leaderID.toString() === req.user._id.toString()) || req.user.role === 'OPO'
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
  trip.club = req.body.club
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

  await calculateRequiredGear(trip)

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
      // If the request was previously approved, delete the associated assignements and send an email
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

  const finalTrip = await trip.save()
  res.json(finalTrip)
}

/**
 * Deletes a trip.
 */
export const deleteTrip = (req, res) => {
  populateTripDocument(Trip.findById(req.params.tripID), ['owner', 'leaders', 'membersUser', 'pendingUser', 'vehicleRequest'])
    .then((trip) => {
      if (trip.leaders.some((leader) => { return leader._id.equals(req.user._id) }) || req.user.role === 'OPO') {
        Trip.deleteOne({ _id: req.params.tripID }, async (err) => {
          if (err) {
            res.json({ error: err })
          } else {
            const trippeeEmails = trip.members
              .concat(trip.pending)
              .map(person => person.user.email)
            await mailer.sendTripDeletedEmail(trip, trip.owner.email, trippeeEmails, req.body.reason)
            if (trip.vehicleRequest) {
              await VehicleRequests.deleteOne(trip.vehicleRequest._id, 'Associated trip has been deleted')
              const leaderEmails = trip.leaders.map(leader => leader.email)
              await mailer.sendTripVehicleRequestDeletedEmail(trip, leaderEmails, trip.vehicleRequest.number)
              res.json({ message: 'Trip and associated vehicle request successfully' })
            } else {
              res.json({ message: 'Trip removed successfully' })
            }
          }
        })
      } else {
        res.status(422).send('You must be a leader on the trip or OPO staff')
      }
    })
    .catch((error) => {
      res.json({ error })
    })
}

/**
 * TRIP GEAR
 */

/**
 * Recalculates the sum of trippee gear requests from the current list of members.
 * @param {Trip} trip
 */
async function calculateRequiredGear (trip) {
  const originalGear = JSON.parse(JSON.stringify(trip.trippeeGear)) // Presumably because of mongo but lol
  trip.trippeeGear.forEach((gear) => { gear.quantity = 0 })
  trip.members.forEach((member) => {
    member.requestedGear.forEach((g) => {
      trip.trippeeGear.forEach((gear) => {
        if (g.gearId === gear._id.toString()) {
          gear.quantity += 1
        }
      })
    })
  })

  if (requiresReapproval(trip, originalGear)) {
    trip.trippeeGearStatus = 'pending'
    sendLeadersEmail(trip._id, `Trip #${trip.number}: Trippee gear requests un-approved`, `Hello,\n\nYour [Trip #${trip.number}: ${trip.title}]'s trippee (not group) gear requests was originally approved by OPO staff, but since a new trippee was admitted who requested additional gear, it has automatically been sent back to review to OPO staff to ensure we have enough.\nCurrently, your trip's status has been changed back to pending, and you should await re-approval before heading out.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
    mailer.sendGearRequiresReapprovalNotice(trip)
  }

  return trip.save()
}

function requiresReapproval (trip, originalGear) {
  const wasApproved = trip.trippeeGearStatus === 'approved'
  const hasChanged = originalGear.length !== trip.trippeeGear.length ||
    !originalGear
      .map((o, i) => [o, trip.trippeeGear[i]])
      .every((combined) => (combined[0].name === combined[1].name && combined[0].quantity >= combined[1].quantity && combined[0].sizeType === combined[1].sizeType))
  return wasApproved && hasChanged
}

/**
 * Allows a user - both pending and approved - to edit their gear requests.
 */
export async function editUserGear (req, res) {
  const { tripID } = req.params
  const { trippeeGear } = req.body
  const trip = await populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'membersUser'])
  const isOnTrip = trip.members.some(member => member.user.id === req.user._id.toString())
  const allPotentialMembers = trip.pending.concat(trip.members)
  allPotentialMembers.forEach(async (person) => {
    if (person.user._id.equals(req.user._id)) {
      person.requestedGear = trippeeGear
      if (isOnTrip) {
        const user = await Users.getUserById(req.user._id)
        const leaderEmails = trip.leaders.map(leader => leader.email)
        mailer.sendGearRequestChangedEmail(trip, leaderEmails, user)
      }
    }
  })
  calculateRequiredGear(trip).then(() => {
    trip.save().then(() => {
      res.send()
    })
  })
}

// JOINING AND LEAVING TRIPS

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {String} tripID
 * @param {String} joiningUserID
 * @param {} requestedGear
 */
export const apply = (tripID, joiningUserID, requestedGear) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'membersUser', 'pendingUser'])
      .then(async (trip) => {
        if (!trip.pending.some((pender) => { return pender.user._id.toString() === joiningUserID.toString() })) {
          trip.pending.push({ user: joiningUserID, requestedGear })
          await trip.save()
          const joiningUser = await Users.getUserById(joiningUserID.toString())
          const tripOwnerEmail = trip.owner.email
          mailer.sendTripApplicationConfirmation(trip, joiningUser, tripOwnerEmail)
        }
        // const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        // mailer.send({ address: leaderEmails, subject: `Trip #${trip.number}: ${foundUser.name} applied to your trip`, message: `Hello,\n\nTrippee ${foundUser.name} has applied to join [Trip #${trip.number}: ${trip.title}]. Please use our platform to approve them. You can reach them at ${foundUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.` });
        resolve()
      })
      .catch((error) => { reject(error) })
  })
}

/**
 * Moves a pending member to the approved list, while adding their gear requests to the trip's total.
 * Sends approved notification email to the trippee and a notice to all leaders and co-leaders.
 * @param {String} tripID The ID of the trip to join
 * @param {String} admittedUserID The user ID who is requesting to join
 */
export const admit = (tripID, admittedUserID) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'membersUser', 'pendingUser'])
      .then(async (trip) => {
        let joiningUserPender = {}
        // Remove user from pending list
        trip.pending.forEach((pender, index) => {
          if (pender.user._id.toString() === admittedUserID) {
            // eslint-disable-next-line prefer-destructuring
            joiningUserPender = trip.pending.splice(index, 1)[0]
          }
        })

        if (joiningUserPender == null) reject(new Error('This user is not yet on the pending list for this trip'))

        // Add user to member list
        if (!trip.members.some((member) => { return member.user._id.toString() === admittedUserID })) {
          trip.members.push(joiningUserPender)
        } else reject(new Error('This user is already approved to be on the trip'))

        await calculateRequiredGear(trip)
        await trip.save()
        const foundUser = await Users.getUserById(admittedUserID)
        mailer.sendTripApprovalEmail(trip, foundUser)
        resolve()
      })
      .catch((error) => { reject(error) })
  })
}

/**
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripID The ID of the trip to leave
 * @param {String} leavinUserID The user ID who is leaving
 */
export const unAdmit = (tripID, leavingUserID) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'membersUser', 'pendingUser'])
      .then(async (trip) => {
        let leavingUserPender
        // Remove the trippee from the member list
        trip.members.forEach((member, index) => {
          if (member.user._id.toString() === leavingUserID) {
            // eslint-disable-next-line prefer-destructuring
            leavingUserPender = trip.members.splice(index, 1)[0]
          }
        })
        // Remove the trippee from the leader list if they were co-leader
        trip.leaders.forEach((leader, index) => {
          if (leader._id.toString() === leavingUserID) {
            // eslint-disable-next-line prefer-destructuring
            trip.leaders.splice(index, 1)
          }
        })
        // Add user to pending list
        if (leavingUserPender == null) reject(new Error('This user was not on the approved list before'))
        if (!trip.pending.some((pender) => { return pender.user._id.toString() === leavingUserID })) {
          trip.pending.push(leavingUserPender)
        }
        await calculateRequiredGear(trip)
        await trip.save()
        const foundUser = await Users.getUserById(leavingUserID)
        mailer.sendTripRemovalEmail(trip, foundUser)
        resolve()
      })
      .catch((error) => { console.log(error); reject(error) })
  })
}

/**
 * Removes a currently pending trippee.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripID The ID of the trip to leave
 * @param {String} rejectedUserID The user ID who is leaving
 */
export const reject = (tripID, rejectedUserID) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'pendingUser'])
      .then(async (trip) => {
        let rejectedUser
        // Remove the trippee from the member list
        trip.pending.forEach((pender, index) => {
          if (pender.user._id.toString() === rejectedUserID) {
            // eslint-disable-next-line prefer-destructuring
            rejectedUser = trip.pending.splice(index, 1)[0]?.user
          }
        })
        // Add user to pending list
        if (rejectedUser == null) reject(new Error('This user was not on the waitlist'))
        await trip.save()
        mailer.sendTripTooFullEmail(trip, rejectedUser)
        resolve()
      })
      .catch((error) => { console.log(error); reject(error) })
  })
}

/**
 * Processes request from trippee to leave trip.
 * If the trippee was approved, removes all gear requested by trippee in the group list and sends email alert to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to leave from
 * @param {String} leavingUserID The ID of the user leaving
 */
export async function leave (tripID, leavingUserID) {
  const trip = await populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'membersUser'])

  // If user is in the list of pending tripees, remove them
  trip.pending = trip.pending.filter((tripee) => tripee.user.toString() !== leavingUserID)

  // If user is in the list of accepted tripees, remove them
  // Should be mutually exclusive with pending tripees, but you never know
  const memberIndex = trip.members.findIndex((tripee) => tripee.user.toString() === leavingUserID)
  if (memberIndex > -1) {
    const leaderEmails = trip.leaders.map(leader => leader.email)
    const leavingUser = await Users.getUserById(leavingUserID)
    mailer.sendUserLeftEmail(trip, leaderEmails, leavingUser)
    trip.members = trip.members.slice(memberIndex)
  }
  const newTrip = await trip.save()
  calculateRequiredGear(newTrip)
}

export const toggleTripLeadership = (req, res) => {
  populateTripDocument(Trip.findById(req.params.tripID), ['owner', 'leaders', 'membersUser', 'pendingUser'])
    .then(async (trip) => {
      let demoted = false
      trip.leaders.some((leader, index) => {
        if (req.body.member.user.id === leader.id) {
          trip.leaders.splice(index, 1)
          demoted = true
          sendLeadersEmail(req.params.tripID, `Trip #${trip.number}: co-leader change`, `Hello trip leaders and co-leaders,\n\n${req.body.member.user.name} has been removed as a co-leader for [Trip #${trip.number}: ${trip.title}]. You can reach them at ${req.body.member.user.email}.\n\nYou can view the trip at ${constants.frontendURL}/trip/${req.params.tripID}\n\nStay Crunchy 🌳,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
          mailer.sendCoLeaderRemovalNotice(trip, req.body.member.user)
        }
        return leader._id.equals(req.body.member.user._id)
      })
      if (!demoted) {
        trip.members.some((member) => {
          if (member.user._id.equals(req.body.member.user._id)) {
            mailer.sendCoLeaderConfirmation(trip, req.body.member.user)
            trip.leaders.push(member.user)
          }
          return member.user._id.equals(req.body.member.user._id)
        })
      }
      trip.members.forEach((m) => { return console.log(m.user.name) })
      trip.leaders.forEach((m) => { return console.log(m.name) })
      await trip.save()
      res.json(await getTrip(req.params.tripID))
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.message)
    })
}

/**
 * Sets the attending status for each member of trip.
 */
export const setMemberAttendance = (req, res) => {
  const { tripID } = req.params
  const { memberID } = req.body
  const { status } = req.body
  Trip.findById(tripID).then((trip) => {
    Promise.all(
      trip.members.map((member) => {
        if (member.user.toString() === memberID) {
          return new Promise((resolve) => {
            member.attended = status
            resolve()
          })
        } else return null
      })
    ).then(() => {
      trip.save().then(() => {
        res.json({ status })
      })
    })
  }).catch((error) => { return res.status(500).json(error) })
}

/**
 * TRIP STATUS
 */

/**
 * Sets the returned status for the trip.
 */
export const toggleTripLeftStatus = (req, res) => {
  const { tripID } = req.params
  const { status } = req.body
  const now = new Date()
  populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'vehicleRequest'])
    .then(async (trip) => {
      trip.left = status
      await trip.save()
      if (trip.vehicleRequest) {
        trip.vehicleRequest.assignments.forEach(Assignments.markAssignmentPickedUp)
      }
      sendLeadersEmail(trip._id, `Trip #${trip.number} ${!status ? 'un-' : ''}left`, `Hello,\n\nYou have marked your Trip #${trip.number}: ${trip.title} as just having ${!status ? 'NOT ' : ''}left ${trip.pickup} at ${constants.formatDateAndTime(now)}, and your trip is due for return at ${constants.formatDateAndTime(trip.endDateAndTime)}.\n\nIMPORTANT: within 90 minutes of returning from this trip, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${Users.tokenForUser(req.user._id, 'mobile', trip._id)}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
      res.json(await getTrip(tripID))
    }).catch((error) => { return res.status(500).json(error) })
}

/**
 * Sets the returned status for the trip.
 */
export const toggleTripReturnedStatus = (req, res) => {
  const { tripID } = req.params
  const { status } = req.body
  const now = new Date()
  populateTripDocument(Trip.findById(tripID), ['owner', 'leaders', 'vehicleRequest'])
    .then(async (trip) => {
      trip.returned = status
      await trip.save()
      if (trip.vehicleRequest) {
        trip.vehicleRequest.assignments.forEach(Assignments.markAssignmentReturned)
      }
      sendLeadersEmail(trip._id, `Trip #${trip.number} ${!status ? 'un-' : ''}returned`, `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, has been marked as ${!status ? 'NOT ' : ''}returned at ${constants.formatDateAndTime(now)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`)
      if (trip.markedLate) { // will inform OPO that the trip has been returned if it had been marked as late (3 hr) before
        trips.sendLateTripBackAnnouncement(trip, status, now)
      }
      res.json(await getTrip(tripID))
    }).catch((error) => { return res.status(500).json(error) })
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
export const respondToGearRequest = (tripID, status) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'leaders'])
      .then(async (trip) => {
        trip.gearStatus = status
        await trip.save()
        const leaderEmails = trip.leaders.map((leader) => { return leader.email })
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
        resolve(await getTrip(tripID))
      })
      .catch((error) => { reject(error) })
  })
}

/**
 * OPO approves or denies a trip's trippee gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export const respondToTrippeeGearRequest = (tripID, status) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'leaders'])
      .then(async (trip) => {
        trip.trippeeGearStatus = status
        await trip.save()
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
        const leaderEmails = trip.leaders.map((leader) => { return leader.email })
        mailer.sendIndividualGearStatusUpdate(trip, leaderEmails, message)
        resolve(await getTrip(tripID))
      }).catch((error) => { console.log(error.message); reject(error) })
  })
}

/**
 * OPO assigns a P-Card to a trip or denies.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const respondToPCardRequest = (req, res) => {
  populateTripDocument(Trip.findById(req.params.tripID), ['owner', 'leaders'])
    .then(async (trip) => {
      trip.pcardStatus = req.body.pcardStatus
      trip.pcardAssigned = req.body.pcardAssigned
      await trip.save()
      const leaderEmails = trip.leaders.map((leader) => { return leader.email })
      mailer.sendPCardStatusUpdate(trip, leaderEmails)
      res.json(await getTrip(req.params.tripID))
    }).catch((error) => {
      res.status(500).send(error)
    })
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
