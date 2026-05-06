import * as tripCard from '../trip/trip-card.js'
import * as vehicleRequestView from '../vehicle-request.js'
import * as emails from '../../emails.js'
import * as mailer from '../../services/mailer.js'
import { BadRequestError } from '../../request/errors.js'

//TODO: lmao this file is gear AND vehicles???
export function approveVehicleRequest(req, res) {
  if (!req.params.requestId) return res.sendStatus(400)
  const vehiclerequest = req.db
    .get('SELECT id, trip FROM vehiclerequests WHERE id = ?', req.params.requestId)

  const input = { ...req.body }
  const assignments = []
  let index = 1
  try {
    while (input[`vehicle-${index}`]) {
      const pickup_time = new Date(input[`pickup-${index}`]).getTime()
      const return_time = new Date(input[`return-${index}`]).getTime()

      if (pickup_time > return_time) {
        throw new BadRequestError('Pickup time must be before return time')
      } else if (pickup_time < Date.now()) {
        throw new BadRequestError('Pickup time must be in the future')
      }

      const assignment = {
        vehiclerequest: vehiclerequest.id,
        requester: req.user,
        vehicle: input[`vehicle-${index}`],
        vehicle_key: input[`key-${index}`],
        pickup_time,
        return_time,
        response_index: index - 1
      }
      assignments.push(assignment)
      index++
    }
  } catch (error) {
    console.warn(error)
    console.warn('Incorrect input error')
    console.warn(input)
    return res.sendStatus(400)
  }

  req.db.run('DELETE FROM assignments WHERE vehiclerequest = ?', vehiclerequest.id)
  req.db.runMany(`
    INSERT INTO assignments (vehiclerequest, requester, pickup_time, return_time, vehicle,
      vehicle_key, response_index)
    VALUES (@vehiclerequest, @requester, @pickup_time, @return_time, @vehicle, @vehicle_key,
      @response_index)
  `, assignments)
  req.db.run('UPDATE vehiclerequests SET is_approved = true WHERE id = ?', vehiclerequest.id)

  mailer.send(emails.getVehicleRequestProcessedEmail, req.db, vehiclerequest.trip)
  vehicleRequestView.renderVehicleRequestTable(req, res, vehiclerequest.id)
}

export function denyVehicleRequest(req, res) {
  const vehicleRequestId = req.params.requestId
  if (!vehicleRequestId) return res.sendStatus(400)
  req.db.run('UPDATE vehiclerequests SET is_approved = false WHERE id = ?', req.params.requestId)
  req.db.run('DELETE FROM assignments WHERE vehiclerequest = ?', req.params.requestId)

  mailer.send(emails.getVehicleRequestDeniedEmail, req.db, vehicleRequestId)
  vehicleRequestView.renderVehicleRequestTable(req, res, vehicleRequestId)
}

export function resetVehicleRequest(req, res) {
  if (!req.params.requestId) return res.sendStatus(400)
  req.db.run('UPDATE vehiclerequests SET is_approved = null WHERE id = ?', req.params.requestId)
  req.db.run('DELETE FROM assignments WHERE vehiclerequest = ?', req.params.requestId)
  vehicleRequestView.renderVehicleRequestTable(req, res, req.params.requestId)
}

//TODO: organize / reorder these functions
//
//
export function approveGroupGear(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  req.db.run('UPDATE group_gear_requests SET is_approved = true WHERE trip = ? AND gear_id = ?', req.params.tripId, req.params.gearId)

  //TODO: turn this into "if this is the last gear to be approved, update the entire thing..."
  //req.db.run('UPDATE trips SET group_gear_approved = true WHERE id = ?', req.params.tripId)
  //tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
  tripCard.renderGroupGear(req, res, req.params.tripId, req.user)
}

export function getAdjustGroupGear(req, res) {
  const quantity = req.params.quantity
  const gear_id = req.params.gearId
  const trip_id = req.params.tripId

  return res.render('trip/adjust-gear-component.njk', {gear_type: "group", trip_id, gear_id, quantity})
}

export function putAdjustGroupGear(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  const quantity = req.body.quantity
  const tripId = req.params.tripId
  const gearId = req.params.gearId

  req.db.run('UPDATE group_gear_requests SET is_approved = true, quantity = ? WHERE trip = ? AND gear_id = ?', quantity, tripId, gearId)
  tripCard.renderGroupGear(req, res, req.params.tripId, req.user)
}

export function denyGroupGear(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  req.db.run('UPDATE group_gear_requests SET is_approved = false WHERE trip = ? AND gear_id = ?', req.params.tripId, req.params.gearId)
  // if any gear is denied, the whole gear is marked as denied //NOTE: should check this is desired?
  req.db.run('UPDATE trips SET group_gear_approved = false WHERE id = ?', req.params.tripId)
  tripCard.renderGroupGear(req, res, req.params.tripId, req.user)
}

export function resetGroupGear(req, res) {
  //TODO: talk with andrew, what should this even do...?
  //    im thinking like...nothing?
  if (!req.params.tripId) return res.sendStatus(400)
  //req.db.run('UPDATE trips SET group_gear_approved = null WHERE id = ?', req.params.tripId)
  //tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
}

export function approveMemberGear(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  req.db.run('UPDATE member_gear_requests SET is_approved = true WHERE trip = ? AND gear_id = ?', req.params.tripId, req.params.gearId)
  //req.db.run('UPDATE trips SET member_gear_approved = true WHERE id = ?', req.params.tripId)
  tripCard.renderMemberGear(req, res, req.params.tripId, req.user)
  //TODO: decide on this function. kinda redundant to just rely on the trips.getLeaderData function, but it at least "feels" better...
}

export function getAdjustMemberGear(req, res) {
  const quantity = req.params.quantity
  const gear_id = req.params.gearId
  return res.render('trip/adjust-gear-component.njk', {gear_type: "member", gear_id, quantity})
}

export function putAdjustMemberGear(req, res) {
  //TODO: not even close to implemented
  //    NOTE: member gear is not stored as a simple "quantity" (and is a derived metric instead) so this isn't exactly trivial to adjust?
  //    likeeely going to need some creativity (and allow it to get ugly...)
  //if (!req.params.tripId) return res.sendStatus(400) //NOTE: this type of data validation prolly important...
  //req.db.run('UPDATE member_gear_requests') 
  //req.db.run('UPDATE trips SET group_gear_approved = true, quantity = ?  WHERE id = ?', req.params.quantity, req.params.tripId)
  tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
}

export function denyMemberGear(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  //req.db.run('UPDATE trips SET member_gear_approved = false WHERE id = ?', req.params.tripId)
  req.db.run('UPDATE member_gear_requests SET is_approved = false WHERE trip = ? AND gear_id = ?', req.params.tripId, req.params.gearId)
  tripCard.renderMemberGear(req, res, req.params.tripId, req.user)
}

export function resetMemberGear(req, res) {
  //TODO: talk with andrew, wtf should this do...?
  if (!req.params.tripId) return res.sendStatus(400)
  //req.db.run('UPDATE trips SET member_gear_approved = null WHERE id = ?', req.params.tripId)
  //tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
}

export function approvePcard(req, res) {
  const tripId = req.params.tripId
  const assigned_pcard = req.body.assigned_pcard
  if (!assigned_pcard) return res.sendStatus(400)
  req.db.run('UPDATE trip_pcard_requests SET is_approved = true, assigned_pcard = ? WHERE trip = ?',
    assigned_pcard, tripId)
  tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
}

export function denyPcard(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  req.db.run('UPDATE trip_pcard_requests SET is_approved = false WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
}

export function resetPcard(req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  req.db.run('UPDATE trip_pcard_requests SET is_approved = null WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(req, res, req.params.tripId, req.user)
}
