import { ObjectId } from 'mongodb'

import { vehicleRequests } from '../services/mongo.js'
import * as Assignments from '../controllers/assignment-controller.js'
import * as Users from '../controllers/user-controller.js'
import * as Vehicles from '../controllers/vehicle-controller.js'
import * as Globals from '../controllers/global-controller.js'
import * as Trips from '../controllers/trip-controller.js'

import * as utils from '../utils.js'
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
async function getCurrentVehicleRequests () {
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

  return enhancedRequests
}

async function getAllSoloRequests () {
  return vehicleRequests.find({ requestType: 'SOLO' }).toArray()
}

/**
 * Create a new VehicleRequest.
 *
 * The "requestObject" in the parameter list refers to the JSON object sent by
 * the frontend, requesting to create a new VehicleRequest. Yes the name scheme
 * is a little convoluted, but there isn't much that can be done about that
 * right now.
 */
export async function createNewVehicleRequest (requestObject) {
  // Retrieves the current maximum vehicle request number and then updates it immediately.
  const number = await Globals.incrementVehicleRequestNumber()
  const { requester, requestDetails, mileage, noOfPeople, requestType, timezone, associatedTrip } = requestObject
  const requestedVehicles = requestObject.requestedVehicles.map((vehicle) => ({
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
    requestedVehicles,
    associatedTrip,
    assignments: []
  }

  const { insertedId } = await vehicleRequests.insertOne(vehicleRequest)
  return { ...vehicleRequest, _id: insertedId }
}

export async function updateVehicleRequest (requestObject) {
  // Get new vehicle request and add date objects to it
  const requestedVehicles = requestObject.requestedVehicles.map((vehicle) => {
    const { pickupDate, pickupTime, returnDate, returnTime } = vehicle
    const pickupDateAndTime = constants.createDateObject(pickupDate, pickupTime, requestObject.timezone)
    const returnDateAndTime = constants.createDateObject(returnDate, returnTime, requestObject.timezone)
    return { ...vehicle, pickupDateAndTime, returnDateAndTime }
  })

  const vehicleRequest = {
    assignments: requestObject.assignments,
    associatedTrip: requestObject.associatedTrip,
    mileage: requestObject.mileage,
    noOfPeople: requestObject.noOfPeople,
    requestDetails: requestObject.requestDetails,
    requestType: requestObject.requestType,
    requestedVehicles,
    requester: requestObject.requester,
    status: requestObject.status,
    timezone: requestObject.timezone
  }
  // The frontend sometimes send back the entire requester object, not just the ID
  const requester = requestObject.requester._id || requestObject.requester
  if (requester) vehicleRequest.requester = new ObjectId(requester)

  const saveResult = await vehicleRequests.findOneAndUpdate(
    { _id: new ObjectId(requestObject._id) },
    { $set: vehicleRequest },
    { returnDocument: 'after' }
  )

  return saveResult.value
}

export async function handleGetVehicleRequest (req, res) {
  const vehicleRequest = await getVehicleWithAssignments(req.params.id)
  return res.json(vehicleRequest)
}

export async function handlePostVehicleRequests (req, res) {
  const savedRequest = await createNewVehicleRequest(req.body)
  const { email } = await Users.getUserById(req.body.requester)
  mailer.sendVehicleRequestCreatedEmail(savedRequest, [email])
  return res.json(savedRequest)
}

export async function handleGetVehicleRequests (_req, res) {
  const vehicleRequests = await getCurrentVehicleRequests()
  return res.json(vehicleRequests)
}

export async function handlePutVehicleRequest (req, res) {
  const existingRequest = await getVehicleRequestById(req.body._id)
  if (existingRequest.status !== 'pending' && req.user.role !== 'OPO') {
    return res.status(401).send('Only OPO staff can update non-pending requests')
  }
  const requestObject = utils.pick(req.body,
    ['requestDetails', 'mileage', 'requestType', 'noOfPeople', 'timezone', 'associatedTrip', 'status'])
  const updatedRequest = await updateVehicleRequest(requestObject)
  return res.json(updatedRequest)
}

export async function handleDeleteVehicleRequest (req, res) {
  await deleteOne(req.params.id, 'no reason provided')
  return res.sendStatus(200)
}

/**
 * Delete a vehicle request from the database.
 *
 * If the reason string is provided, send an email to the requester informing
 * them that the vehicle has been deleted. If no reason string is provided, do
 * not send an email.
 */
export async function deleteOne (vehicleRequestID, reason) {
  const vehicleRequest = await getVehicleRequestById(vehicleRequestID)
  await Assignments.deleteAssignments(vehicleRequest.assignments)
  const deleteRequest = vehicleRequests.deleteOne({ _id: vehicleRequestID })

  if (reason) {
    await deleteRequest
    const leaderEmail = await Users.getUserById(vehicleRequest.requester)
    return mailer.sendVehicleRequestDeletedEmail(vehicleRequest, leaderEmail, reason)
  } else {
    return deleteRequest
  }
}

export async function handleOpoPost (req, res) {
  const vehicleRequest = await getVehicleRequestById(req.params.id)
  const proposedAssignments = req.body.assignments || []

  // This used to be synchronous, keeping it that way because I don't want to mess with it right now
  const assignmentIds = []
  for (const assignment of proposedAssignments) {
    const insertedId = await Assignments.processAssignment(vehicleRequest, assignment)
    assignmentIds.push(insertedId)
  }

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

/* Deny vehicle request and inform requester.  */
export const handleOpoPut = async (req, res) => {
  const vehicleRequest = await markVehicleRequestDenied(req.params.id)
  if (vehicleRequest.requestType === 'TRIP') {
    Trips.markVehicleStatusDenied(vehicleRequest.associatedTrip)
  }

  const { email } = await Users.getUserById(vehicleRequest.requester)
  mailer.sendVehicleRequestDeniedEmail(vehicleRequest, [email])
  res.sendStatus(200)
}

/* Delete vehicle assignment. */
export async function handleOpoDelete (req, res) {
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
