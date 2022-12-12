import { ObjectId } from 'mongodb'

import { vehicleRequests } from '../services/mongo.js'
import * as Assignments from '../controllers/assignment-controller.js'
import * as Users from '../controllers/user-controller.js'
import * as Vehicles from '../controllers/vehicle-controller.js'
import * as Globals from '../controllers/global-controller.js'

import * as db from '../services/sqlite.js'
import * as utils from '../utils.js'
import * as constants from '../constants.js'
import * as mailer from '../services/mailer.js'

export function getVehicleRequestById (id) {
  return db.getVehicleRequestById(id)
}

export function getVehicleRequestsByRequester (requesterId) {
  return db.getVehicleRequestsByRequester(requesterId)
}

export async function getVehicleWithAssignments (id) {
  const vehicleRequest = await vehicleRequests.findOne({ _id: new ObjectId(id) })
  const associations = Promise.all([
    Users.getUserById(vehicleRequest.requester),
    Assignments.getAssignmentByIds(vehicleRequest.assignments),
    db.getTripById(vehicleRequest.associatedTrip)
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
 *
 * All in all not so bad though.
 */
async function getCurrentVehicleRequests () {
  const requests = db.getVehicleRequestsForOpo()
  // Sort by the first vehicle's pickup date
  requests.sort((a, b) =>
    a.requestedVehicles[0]?.pickupDateAndTime < b.requestedVehicles[0]?.pickupDateAndTime ? -1 : 1)

  return requests
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
    assignments: requestObject.assignments || [],
    mileage: requestObject.mileage,
    noOfPeople: requestObject.noOfPeople,
    requestDetails: requestObject.requestDetails,
    requestType: requestObject.requestType,
    requestedVehicles,
    requester: requestObject.requester,
    status: requestObject.status,
    timezone: requestObject.timezone
  }

  // The frontend does not send these fields
  if (requestObject.associatedTrip) vehicleRequest.associatedTrip = requestObject.associatedTrip

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
  const requestObject = utils.pick(req.body, [
    '_id',
    'mileage',
    'noOfPeople',
    'requestDetails',
    'requestType',
    'requestedVehicles',
    'requester',
    'status',
    'timezone'
  ])
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
  const deleteRequest = await vehicleRequests.findOneAndDelete({ _id: vehicleRequestID })

  if (reason) {
    const leaderEmail = await Users.getUserById(vehicleRequest.requester)
    mailer.sendVehicleRequestDeletedEmail(vehicleRequest, leaderEmail, reason)
  }

  return deleteRequest.value
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
    const associatedTrip = db.getTripById(vehicleRequest.associatedTrip)
    const leaderEmails = await Users.getUserEmails(associatedTrip.leaders)
    await db.markTripVehicleStatusApproved(associatedTrip._id)
    mailer.sendTripVehicleRequestProcessedEmail(vehicleRequest, [requester, ...leaderEmails], associatedTrip)
  } else {
    mailer.sendVehicleRequestProcessedEmail(vehicleRequest, [requester])
  }

  const savedVehicleRequest = await vehicleRequests.findOneAndUpdate({ _id: vehicleRequest._id }, { $set: vehicleRequest }, { returnDocument: 'after' })
  const updatedVehicleRequest = await getVehicleWithAssignments(savedVehicleRequest.value._id)
  return res.json({ updatedVehicleRequest })
}

/* Deny vehicle request and inform requester.  */
export function handleOpoPut (req, res) {
  db.markVehicleRequestDenied(req.params.id)
  const vehicleRequest = db.getVehicleRequestById(req.params.id)
  if (vehicleRequest.requestType === 'TRIP') {
    db.markTripVehicleStatusDenied(vehicleRequest.associatedTrip)
  }

  const { email } = db.getUserById(vehicleRequest.requester)
  mailer.sendVehicleRequestDeniedEmail(vehicleRequest, [email])
  return res.sendStatus(200)
}

/* Delete vehicle assignment. */
export async function handleOpoDelete (req, res) {
  const { toBeDeleted } = req.body.deleteInfo
  const assignmentDeletionPromises = toBeDeleted.map(async (id) => {
    const assignment = db.getAssignmentById(id)
    db.deleteAssignment(id)
    const vehicleRequest = db.getVehicleRequestById(assignment.request)
    const { email } = db.getUserById(vehicleRequest.requester)

    if (db.getAssignmentsForVehicleRequest(vehicleRequest.id) === 0) {
      db.markVehicleRequestDenied(req.params.id)
      if (vehicleRequest.requestType === 'TRIP') {
        await db.markTripVehicleStatusDenied(vehicleRequest.associatedTrip)
      }
    }
    mailer.sendVehicleRequestCancelledEmail(vehicleRequest, [email], req.user.email)
  })

  await Promise.all(assignmentDeletionPromises)
  await Assignments.deleteAssignments(toBeDeleted)
  return res.sendStatus(204)
}
