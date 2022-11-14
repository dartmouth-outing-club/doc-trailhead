import { subtract } from 'date-arithmetic'
import { ObjectId } from 'mongodb'

import Assignment from '../models/assignment-model.js'
import { vehicleRequests } from '../services/mongo.js'
import * as Assignments from '../controllers/assignment-controller.js'
import * as Users from '../controllers/user-controller.js'
import * as Vehicles from '../controllers/vehicle-controller.js'
import * as Globals from '../controllers/global-controller.js'
import * as Trips from '../controllers/trip-controller.js'
import * as constants from '../constants.js'
import * as mailer from '../services/mailer.js'

export async function getVehicleRequestById (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return vehicleRequests.findOne({ _id })
}

export async function getVehicleRequestsByRequester (requesterId) {
  return vehicleRequests.find({ requester: new ObjectId(requesterId) }).toArray()
}

async function markVehicleRequestDenied (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  const res = await vehicleRequests.findOneAndUpdate({ _id }, { $set: { status: 'denied' } })
  return res.value
}

export async function createVehicleRequest (req, res) {
  // Retrieves the current maximum vehicle request number and then updates it immediately.
  const number = await Globals.incrementVehicleRequestNumber()
  const { requester, requestDetails, mileage, noOfPeople, requestType, timezone } = req.body
  const requestedVehicles = req.body.requestedVehicles.map((vehicle) => ({
    ...vehicle,
    pickupDateAndTime: constants.createDateObject(vehicle.pickupDate, vehicle.pickupTime, timezone),
    returnDateAndTime: constants.createDateObject(vehicle.returnDate, vehicle.returnTime, timezone)
  }))
  const vehicleRequest = {
    number,
    requester,
    requestDetails,
    mileage,
    noOfPeople,
    requestType,
    requestedVehicles
  }

  const { insertedId } = await vehicleRequests.insertOne(vehicleRequest)
  const savedRequest = { ...vehicleRequest, _id: insertedId }
  const { email } = await Users.getUserById(requester)
  mailer.sendVehicleRequestCreatedEmail(savedRequest, [email])
  return res.json(savedRequest)
}

export async function getVehicleWithAssignments (id) {
  const vehicleRequest = await vehicleRequests.findOne({ _id: new ObjectId(id) })
  const associations = Promise.all([
    Users.getUserById(vehicleRequest.requester),
    Assignments.getAssignmentByIds(vehicleRequest.assignments),
    Trips.getTripById(vehicleRequest.associatedTrip)
  ])
  const [requester, assignments, associatedTrip] = await associations

  const assignmentPromises = assignments.map(async (assignment) => {
    const assigned_vehicle = await Vehicles.getVehicle(assignment.assigned_vehicle)
    return { ...assignment, assigned_vehicle }
  })

  vehicleRequest.assignments = await Promise.all(assignmentPromises)
  vehicleRequest.requester = requester
  vehicleRequest.associatedTrip = associatedTrip
  return vehicleRequest
}

async function getAllSoloRequests () {
  return vehicleRequests.find({ requestType: 'SOLO' }).toArray()
}

export async function getVehicleRequest (req, res) {
  const vehicleRequest = await getVehicleWithAssignments(req.params.id)
  return res.json(vehicleRequest)
}

/**
 * Get all the upcoming vehicle requests.
 *
 * Like a lot of the codebase at this stage, this method is a little clunky
 * because I'm doing imperatively what would normally be handled by an SQL query.
 * Basically it fetches the relevant subsets of data from Mongo and then stiches
 * them together.
 *
 * We're also hampered by the fact that that the vehicle requests aren't dated, so
 * we have to use two different proxies for date depending on whether it's a trip or
 * solo request.
 *
 * All in all not so bad though.
 */
export async function getAllCurrentVehicleRequests (_req, res) {
  const now = new Date()
  const trips = await Trips.getAllCurrentTrips()
  const tripIds = trips.map(trip => trip._id)

  // Filter the trip requests by the trip date
  const tripVehicleRequests = await vehicleRequests.find({ associatedTrip: { $in: tripIds } }).toArray()
  tripVehicleRequests.forEach((request) => {
    request.associatedTrip = trips.find(trip => trip._id.toString() === request.associatedTrip.toString())
  })

  // Filter the solo requests by whether their vehicle is out of date
  const soloRequests = await getAllSoloRequests()
  const soloRequestsFiltered = soloRequests.filter(request => {
    return request.requestedVehicles.every(vehicle => (vehicle.returnDateAndTime > now))
  })

  // Enhance the vehicle requests with their assignments and requesters
  const allRequests = [...tripVehicleRequests, ...soloRequestsFiltered]
  const enhancedRequests = await Assignments.matchAssignmentsToVehicleRequests(allRequests)
  const users = await Users.getUsersById(allRequests.map(request => request.requester))
  enhancedRequests.forEach((request) => {
    const user = users.find(user => user._id.toString() === request.requester.toString())
    request.requester = { name: user.name }
  })

  // Sort by the first vehicle's pickup date
  enhancedRequests.sort((a, b) =>
    a.requestedVehicles[0]?.pickupDateAndTime < b.requestedVehicles[0]?.pickupDateAndTime ? -1 : 1)

  return res.json(enhancedRequests)
}

export async function updateVehicleRequest (req, res) {
  const existingRequest = await getVehicleRequestById(req.body._id)
  if (existingRequest.status !== 'pending' && req.user.role !== 'OPO') {
    return res.status(401).send('Only OPO staff can update non-pending requests')
  }

  // Get new vehicle request and add date objects to it
  const { requestDetails, mileage, requestType, noOfPeople, timezone } = req.body
  const requestedVehicles = req.body.requestedVehicles.map((vehicle) => {
    const { pickupDate, pickupTime, returnDate, returnTime } = vehicle
    const pickupDateAndTime = constants.createDateObject(pickupDate, pickupTime, timezone)
    const returnDateAndTime = constants.createDateObject(returnDate, returnTime, timezone)
    return { ...vehicle, pickupDateAndTime, returnDateAndTime }
  })

  const vehicleRequest = { requestDetails, mileage, requestType, noOfPeople, requestedVehicles }
  // The frontend sometimes send back the entire requester object, not just the ID
  const requester = req.body.requester._id || req.body.requester
  if (requester) vehicleRequest.requester = new ObjectId(requester)

  const saveResult = await vehicleRequests.findOneAndUpdate(
    { _id: new ObjectId(req.body._id) },
    { $set: vehicleRequest },
    { returnDocument: 'after' }
  )
  return res.json(saveResult.value)
}

export async function deleteVehicleRequest (req, res) {
  await deleteVehicle(req.params.id, 'no reason provided')
  return res.sendStatus(200)
}

export async function deleteVehicle (vehicleRequestID, reason) {
  const vehicleRequest = await getVehicleRequestById(vehicleRequestID)
  await Assignments.deleteAssignments(vehicleRequest.assignments)
  await vehicleRequests.deleteOne({ _id: vehicleRequestID })
  const leaderEmail = await Users.getUserById(vehicleRequest.requester)
  return mailer.sendVehicleRequestDeletedEmail(vehicleRequest, leaderEmail, reason)
}

/**
 * Saves a single `proposedAssignment` to the database.
 * @param {String} vehicleRequest
 * @param {Assignment} proposedAssignment
 */
export async function processAssignment (vehicleRequest, proposedAssignment) {
  const vehicle = await Vehicles.getVehicleByName(proposedAssignment.assignedVehicle)
  if (proposedAssignment.existingAssignment) {
    console.log('Updating existing vehicle assignment')
    const existingAssignment = await Assignment.findById(proposedAssignment.id).populate('assigned_vehicle')
    // setting pickup times
    existingAssignment.assigned_pickupDate = proposedAssignment.pickupDate
    existingAssignment.assigned_pickupTime = proposedAssignment.pickupTime
    const pickupDateAndTime = constants.createDateObject(proposedAssignment.pickupDate, proposedAssignment.pickupTime, proposedAssignment.timezone)
    existingAssignment.assigned_pickupDateAndTime = pickupDateAndTime
    // setting return times
    existingAssignment.assigned_returnDate = proposedAssignment.returnDate
    existingAssignment.assigned_returnTime = proposedAssignment.returnTime
    const returnDateAndTime = constants.createDateObject(proposedAssignment.returnDate, proposedAssignment.returnTime, proposedAssignment.timezone)
    existingAssignment.assigned_returnDateAndTime = returnDateAndTime

    existingAssignment.assigned_key = proposedAssignment.assignedKey
    existingAssignment.pickedUp = proposedAssignment.pickedUp
    existingAssignment.returned = proposedAssignment.returned
    existingAssignment.assigned_vehicle = vehicle
    return existingAssignment.save()
  } else {
    console.log('Saving new vehicle assignment')
    const newAssignment = new Assignment()
    // setting basic info
    newAssignment.request = vehicleRequest
    newAssignment.assigned_vehicle = vehicle
    newAssignment.requester = vehicleRequest.requester
    newAssignment.assigned_key = proposedAssignment.assignedKey
    newAssignment.responseIndex = proposedAssignment.responseIndex
    // setting pickup times
    newAssignment.assigned_pickupDate = proposedAssignment.pickupDate
    newAssignment.assigned_pickupTime = proposedAssignment.pickupTime
    const pickupDateAndTime = constants.createDateObject(proposedAssignment.pickupDate, proposedAssignment.pickupTime, proposedAssignment.timezone)
    newAssignment.assigned_pickupDateAndTime = pickupDateAndTime
    // setting return times
    newAssignment.assigned_returnDate = proposedAssignment.returnDate
    newAssignment.assigned_returnTime = proposedAssignment.returnTime
    const returnDateAndTime = constants.createDateObject(proposedAssignment.returnDate, proposedAssignment.returnTime, proposedAssignment.timezone)
    newAssignment.assigned_returnDateAndTime = returnDateAndTime

    return newAssignment.save()
  }
}

export async function respondToVehicleRequest (req, res) {
  const vehicleRequest = await getVehicleRequestById(req.params.id)
  const proposedAssignments = req.body.assignments || []
  //
  // This used to be synchronous, keeping it that way because I don't want to mess with it right now
  const processedAssignments = []
  for (const assignment of proposedAssignments) {
    const result = await processAssignment(vehicleRequest, assignment)
    processedAssignments.push(result)
  }

  const assignmentIds = processedAssignments.map(assignment => new ObjectId(assignment._id))
  vehicleRequest.assignments = assignmentIds
  vehicleRequest.status = 'approved'
  const requester = await Users.getUserById(vehicleRequest.requester)

  if (vehicleRequest.requestType === 'TRIP') {
    const associatedTrip = await Trips.getTripById(vehicleRequest.associatedTrip)
    const leaderEmails = await Users.getUserEmails(associatedTrip.leaders)
    await Trips.markVehicleStatusApproved(associatedTrip._id)
    mailer.sendTripVehicleRequestProcessedEmail(vehicleRequest, [requester, ...leaderEmails], associatedTrip)
  } else {
    mailer.sendVehicleRequestProcessedEmail(vehicleRequest, [requester])
  }

  const savedVehicleRequest = await vehicleRequests.findOneAndUpdate({ _id: vehicleRequest._id }, { $set: vehicleRequest }, { returnDocument: 'after' })
  const updatedVehicleRequest = await getVehicleWithAssignments(savedVehicleRequest.value._id)
  return res.json({ updatedVehicleRequest })
}

/**
 * Deny vehicle requet and inform requester
 */
export const denyVehicleRequest = async (req, res) => {
  const vehicleRequest = await markVehicleRequestDenied(req.params.id)
  if (vehicleRequest.requestType === 'TRIP') {
    Trips.markVehicleStatusDenied(vehicleRequest.associatedTrip)
  }

  const { email } = await Users.getUserById(vehicleRequest.requester)
  mailer.sendVehicleRequestDeniedEmail(vehicleRequest, [email])
  res.sendStatus(200)
}

export const getVehicleAssignments = async (req, res) => {
  const filters = {}
  if (req.query.showPastAssignments === 'false') {
    filters.assigned_pickupDateAndTime = { $gte: subtract(new Date(), 30, 'day') }
  }
  try {
    const assignments = await Assignment.find(filters).populate('requester').populate({ path: 'request', populate: { path: 'associatedTrip', populate: { path: 'leaders' } } }).populate('assigned_vehicle')
      .exec()
    return res.json(assignments)
  } catch (error) {
    console.log(error)
    return res.status(500).send(error)
  }
}

export async function cancelAssignments (req, res) {
  const { toBeDeleted } = req.body.deleteInfo
  const assignmentDeletionPromises = toBeDeleted.map(async (id) => {
    const assignment = await Assignments.getAssignmentById(id)
    const update = await vehicleRequests.findOneAndUpdate(
      { _id: assignment.request },
      { $pull: { assignments: assignment._id } },
      { returnDocument: 'after' }
    )

    const vehicleRequest = update.value
    const { email } = await Users.getUserById(vehicleRequest.requester)

    if (vehicleRequest.assignments.length === 0) {
      await markVehicleRequestDenied(req.params.id)
      if (vehicleRequest.requestType === 'TRIP') {
        await Trips.markVehicleStatusDenied(vehicleRequest.associatedTrip)
      }
    }
    mailer.sendVehicleRequestCancelledEmail(vehicleRequest, [email], req.user.email)
  })

  await Promise.all(assignmentDeletionPromises)
  await Assignments.deleteAssignments(toBeDeleted)
  return res.sendStatus(204)
}
