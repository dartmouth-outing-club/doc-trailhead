import { subtract } from 'date-arithmetic'
import { ObjectId } from 'mongodb'
import { assignments } from '../services/mongo.js'
import * as utils from '../utils.js'
import * as Users from './user-controller.js'
import * as Vehicles from './vehicle-controller.js'
import * as Trips from './trip-controller.js'
import * as VehicleRequests from './vehicle-request-controller.js'

export async function getAssignmentById (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return assignments.findOne({ _id })
}

export async function getAssignmentByIds (ids) {
  return assignments.find({ _id: { $in: ids } }).toArray()
}

export async function deleteAssignments (assignmentsList) {
  await assignments.deleteMany({ _id: { $in: assignmentsList } })
  // For each assignment, delete any conflicts it had
  const promises = assignmentsList.map(assignment => assignments.updateMany({}, { $pull: { conflicts: assignment } }))
  return Promise.all(promises)
}

export async function getAssignmentReturningAfter (time) {
  return assignments.find({ assigned_returnDateAndTime: { $gt: time } })
}

export async function removeAssignmentFromConflicts (assignmentId) {
  return assignments.updateMany({}, { $pull: { conflicts: assignmentId } })
}

export async function matchAssignmentsToVehicleRequests (vehicleRequests) {
  const vehicleRequestIds = vehicleRequests.map(request => request._id)
  const matchableAssignments = await assignments.find({ request: { $in: vehicleRequestIds } }).toArray()
  const assignmentsMap = matchableAssignments.reduce((map, assignment) => {
    map[assignment._id] = assignment
    return map
  }, {})

  vehicleRequests.forEach(request => {
    request.assignments = request.assignments.map(assignment => assignmentsMap[assignment])
  })

  return vehicleRequests
}

export async function getAssignmentsForCalendar (_req, res) {
  const timeWindow = subtract(new Date(), 30, 'day')
  const vehicleMap = await Vehicles.getVehicleMap()
  const recentAssignments = await assignments.find({ assigned_pickupDateAndTime: { $gte: timeWindow } }).toArray()
  const assignmentsWithTripName = await Promise.all(recentAssignments.map(async (assignment) => {
    const vehicleRequest = await VehicleRequests.getVehicleRequestById(assignment.request)
    assignment.request = utils.pick(vehicleRequest, ['_id', 'number', 'requestType', 'requestDetails'])

    const requester = await Users.getUserById(assignment.requester)
    assignment.requester = utils.pick(requester, ['name', 'phone', 'email'])

    if (vehicleRequest?.associatedTrip) {
      const associatedTrip = await Trips.getTripById(vehicleRequest?.associatedTrip)
      assignment.request.associatedTrip = utils.pick(associatedTrip, ['number', 'title', 'description', 'startDateAndTime', 'endDateAndTime'])
    }

    const assigned_vehicle = vehicleMap[assignment.assigned_vehicle]
    delete assigned_vehicle.bookings
    assignment.assigned_vehicle = assigned_vehicle
    return assignment
  }))

  res.json(assignmentsWithTripName)
}
