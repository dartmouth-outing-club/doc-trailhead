import { ObjectId } from 'mongodb'
import { assignments } from '../services/mongo.js'

import * as db from '../services/sqlite.js'
import * as Vehicles from './vehicle-controller.js'

import * as constants from '../constants.js'

export async function getAssignmentByIds (ids) {
  return assignments.find({ _id: { $in: ids } }).toArray()
}

export async function deleteAssignments (assignmentsList) {
  return assignments.deleteMany({ _id: { $in: assignmentsList } })
}

export async function getAssignmentReturningAfter (time) {
  return assignments.find({ assigned_returnDateAndTime: { $gt: time } })
}

export async function removeAssignmentFromConflicts (assignmentId) {
  return assignments.updateMany({}, { $pull: { conflicts: assignmentId } })
}

export async function markAssignmentReturned (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return assignments.updateOne({ _id }, { $set: { returned: true } })
}

export async function markAssignmentPickedUp (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return assignments.updateOne({ _id }, { $set: { pickedUp: true } })
}

export async function matchAssignmentsToVehicleRequests (vehicleRequests) {
  const vehicleRequestIds = vehicleRequests.map(request => request._id)
  const matchableAssignments = await assignments.find({ request: { $in: vehicleRequestIds } }).toArray()
  const assignmentsMap = matchableAssignments.reduce((map, assignment) => {
    map[assignment._id] = assignment
    return map
  }, {})

  vehicleRequests.forEach(request => {
    request.assignments = request.assignments?.map(assignment => assignmentsMap[assignment])
  })

  return vehicleRequests
}

export async function handleGetAssignmentsForCalendar (_req, res) {
  const assignments = db.getCalenderAssignments()
  res.json(assignments)
}

/**
 * Saves a single `proposedAssignment` to the database.
 */
export async function processAssignment (vehicleRequest, proposedAssignment) {
  const vehicle = await Vehicles.getVehicleByName(proposedAssignment.assignedVehicle)
  const { pickupDate, pickupTime, returnDate, returnTime, responseIndex, timezone } = proposedAssignment
  const assigned_pickupDateAndTime = constants.createDateObject(pickupDate, pickupTime, timezone)
  const assigned_returnDateAndTime = constants.createDateObject(returnDate, returnTime, timezone)

  const assignment = {
    request: vehicleRequest._id,
    requester: vehicleRequest.requester,
    responseIndex,
    assigned_returnDate: returnDate,
    assigned_returnTime: returnTime,
    assigned_pickupDate: pickupDate,
    assigned_pickupTime: pickupTime,
    assigned_vehicle: vehicle._id,
    assigned_key: proposedAssignment.assignedKey,
    pickedUp: proposedAssignment.pickedUp,
    returned: proposedAssignment.returned,
    assigned_pickupDateAndTime,
    assigned_returnDateAndTime
  }

  if (proposedAssignment.existingAssignment) {
    console.log('Updating existing vehicle assignment')
    const _id = new ObjectId(proposedAssignment.id)
    await assignments.updateOne({ _id }, { $set: assignment })
    return _id
  } else {
    console.log('Saving new vehicle assignment')
    const { insertedId } = await assignments.insertOne(assignment)
    return insertedId
  }
}
