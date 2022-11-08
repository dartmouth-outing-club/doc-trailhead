import { subtract } from 'date-arithmetic'
import { ObjectId } from 'mongodb'

import VehicleRequest from '../models/vehicle-request-model.js'
import Vehicle from '../models/vehicle-model.js'
import Assignment from '../models/assignment-model.js'
import Trip from '../models/trip-model.js'
import { vehicleRequests } from '../services/mongo.js'
import * as Assignments from '../controllers/assignment-controller.js'
import * as Users from '../controllers/user-controller.js'
import * as Vehicles from '../controllers/vehicle-controller.js'
import * as Globals from '../controllers/global-controller.js'
import * as Trips from '../controllers/trip-controller.js'
import * as constants from '../constants.js'
import * as mailer from '../services/mailer.js'

export async function createVehicleRequest (req, res) {
  // Retrieves the current maximum vehicle request number and then updates it immediately.
  const vehicleRequestNumberMax = await Globals.incrementVehicleRequestNumber()
  const vehicleRequest = new VehicleRequest()
  vehicleRequest.number = vehicleRequestNumberMax
  vehicleRequest.requester = req.body.requester
  vehicleRequest.requestDetails = req.body.requestDetails
  vehicleRequest.mileage = req.body.mileage
  vehicleRequest.noOfPeople = req.body.noOfPeople
  vehicleRequest.requestType = req.body.requestType
  vehicleRequest.requestedVehicles = req.body.requestedVehicles.map((requestedVehicle) => ({
    ...requestedVehicle,
    pickupDateAndTime: constants.createDateObject(requestedVehicle.pickupDate, requestedVehicle.pickupTime, req.body.timezone),
    returnDateAndTime: constants.createDateObject(requestedVehicle.returnDate, requestedVehicle.returnTime, req.body.timezone)
  }))
  const savedRequest = await vehicleRequest.save()
  const requester = await Users.getUserById(vehicleRequest.requester)
  mailer.send({ address: [requester.email], subject: `New V-Req #${savedRequest.number} created`, message: `Hello,\n\nYou've created a new vehicle request, V-Req #${savedRequest.number}: ${savedRequest.requestDetails}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${savedRequest._id}\n\nThis request is not associated with any trip.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.` })
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

export async function getVehicleRequest (req, res) {
  const vehicleRequest = await getVehicleWithAssignments(req.params.id)
  return res.json(vehicleRequest)
}

export async function getAllCurrentVehicleRequests (_req, res) {
  const vehicleRequests = await VehicleRequest.find({})
    .populate('requester')
    .populate('associatedTrip')
    .populate('assignments')

  return res.json(vehicleRequests)
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
  const vehicle = await Vehicle.findOne({ name: proposedAssignment.assignedVehicle }).populate('bookings')
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
 * OPO denies a vehicle request.
 * Sends notice to trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const denyVehicleRequest = async (req, res) => {
  try {
    const vehicleRequest = await VehicleRequest.findById(req.params.id).populate('requester').exec()
    const requester = await Users.getUserById(vehicleRequest.requester)
    const email = { address: [requester.email], subject: '', message: '' }
    vehicleRequest.status = 'denied'
    if (vehicleRequest.requestType === 'TRIP') {
      const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).populate('leaders').exec()
      associatedTrip.vehicleStatus = 'denied'
      email.address = email.address.concat(associatedTrip.leaders.map((leader) => { return leader.email }))
      email.subject = `Trip ${associatedTrip.number}: Your vehicle requests got denied`
      email.message = `Hello,\n\nYour Trip #${associatedTrip.number}'s vehicle request has been denied by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${associatedTrip._id}\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
      await associatedTrip.save()
    }
    await vehicleRequest.save()
    email.subject = 'Your vehicle requests got denied'
    email.message = `Hello,\n\nYour [V-Req #${vehicleRequest.number}] has been denied by OPO staff.\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
    mailer.send(email)
    const updatedVehicleRequest = await VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip').populate('assignments')
      .populate({
        path: 'requester',
        populate: {
          path: 'leader_for',
          model: 'Club'
        }
      })
      .populate({
        path: 'assignments',
        populate: {
          path: 'assigned_vehicle',
          model: 'Vehicle'
        }
      })
      .exec()
    return res.json({ updatedVehicleRequest })
  } catch (error) {
    console.log(error)
    return res.status(500).send(error)
  }
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

export const cancelAssignments = async (req, res) => {
  try {
    const { toBeDeleted } = req.body.deleteInfo
    await Promise.all(toBeDeleted.map(async (id) => {
      const assignment = await Assignment.findById(id)
      await Vehicle.updateOne({ _id: assignment.assigned_vehicle }, { $pull: { bookings: assignment._id } }) // remove from vehicle bookings
      await VehicleRequest.updateOne({ _id: assignment.request }, { $pull: { assignments: assignment._id } }) // remove from vehicle request assignments
      const vehicleRequest = await VehicleRequest.findById(assignment.request)
      const requester = await Users.getUserById(vehicleRequest.requester)
      const email = { address: [requester.email], subject: '', message: '' }
      if (vehicleRequest.assignments.length === 0) {
        vehicleRequest.status = 'denied'
        if (vehicleRequest.requestType === 'TRIP') {
          const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).exec()
          associatedTrip.vehicleStatus = 'denied'
          email.address = email.address.concat(associatedTrip.leaders.map((leader) => { return leader.email }))
          email.subject = `Trip ${associatedTrip.number}: Your vehicle requests have been cancelled`
          email.message = `Hello,\n\nYour [Trip #${associatedTrip.number}]'s vehicle request has been cancelled by OPO staff. You can send the staff member who reviewed the request an email at mailto:${req.user.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${associatedTrip._id}\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
          await associatedTrip.save()
        }
      }
      email.subject = 'Your vehicle requests got cancelled'
      email.message = `Hello,\n\nYour [V-Req #${vehicleRequest.number}]'s assignments have been cancelled by OPO staff. You can send the staff member who reviewed the request an email at mailto:${req.user.email}.\n\nView the vehicle request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
      mailer.send(email)
      await vehicleRequest.save()
    }))
    await Assignment.deleteMany({ _id: { $in: toBeDeleted } })
    const updatedVehicleRequest = await VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip').populate('assignments')
      .populate({
        path: 'requester',
        populate: {
          path: 'leader_for',
          model: 'Club'
        }
      })
      .populate({
        path: 'assignments',
        populate: {
          path: 'assigned_vehicle',
          model: 'Vehicle'
        }
      })
      .exec()
    return res.json({ updatedVehicleRequest })
  } catch (error) {
    console.log(error)
    return res.status(500).send(error)
  }
}

async function getVehicleRequestById (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return vehicleRequests.findOne({ _id })
}
