import * as sqlite from '../../services/sqlite.js'
import * as tripCard from '../../views/trip-card.js'
import * as vehicleRequestView from '../../views/vehicle-request.js'
import * as mailer from '../../services/mailer.js'

export function approveVehicleRequest (req, res) {
  if (!req.params.requestId) return res.sendStatus(400)
  const vehiclerequest = sqlite
    .get('SELECT id, trip FROM vehiclerequests WHERE id = ?', req.params.requestId)

  const input = { ...req.body }
  const assignments = []
  let index = 1
  try {
    while (input[`vehicle-${index}`]) {
      const assignment = {
        vehiclerequest: vehiclerequest.id,
        requester: req.user,
        vehicle: input[`vehicle-${index}`],
        vehicle_key: input[`key-${index}`],
        pickup_time: new Date(input[`pickup-${index}`]).getTime(),
        return_time: new Date(input[`return-${index}`]).getTime(),
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

  sqlite.run('DELETE FROM assignments WHERE vehiclerequest = ?', vehiclerequest.id)
  sqlite.runMany(`
    INSERT INTO assignments (vehiclerequest, requester, pickup_time, return_time, vehicle,
      vehicle_key, response_index)
    VALUES (@vehiclerequest, @requester, @pickup_time, @return_time, @vehicle, @vehicle_key,
      @response_index)
  `, assignments)
  sqlite.run('UPDATE vehiclerequests SET is_approved = true WHERE id = ?', vehiclerequest.id)
  mailer.sendTripVehicleRequestProcessedEmail(vehiclerequest.trip)
  vehicleRequestView.renderVehicleRequestTable(res, vehiclerequest.id)
}

export function denyVehicleRequest (req, res) {
  const vehicleRequestId = req.params.requestId
  if (!vehicleRequestId) return res.sendStatus(400)
  sqlite.run('UPDATE vehiclerequests SET is_approved = false WHERE id = ?', req.params.requestId)
  sqlite.run('DELETE FROM assignments WHERE vehiclerequest = ?', req.params.requestId)

  mailer.sendVehicleRequestDeniedEmail(vehicleRequestId)
  vehicleRequestView.renderVehicleRequestTable(res, vehicleRequestId)
}

export function resetVehicleRequest (req, res) {
  if (!req.params.requestId) return res.sendStatus(400)
  sqlite.run('UPDATE vehiclerequests SET is_approved = null WHERE id = ?', req.params.requestId)
  sqlite.run('DELETE FROM assignments WHERE vehiclerequest = ?', req.params.requestId)
  vehicleRequestView.renderVehicleRequestTable(res, req.params.requestId)
}

export function approveGroupGear (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trips SET group_gear_approved = true WHERE id = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function denyGroupGear (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trips SET group_gear_approved = false WHERE id = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function resetGroupGear (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trips SET group_gear_approved = null WHERE id = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function approveMemberGear (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trips SET member_gear_approved = true WHERE id = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function denyMemberGear (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trips SET member_gear_approved = false WHERE id = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function resetMemberGear (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trips SET member_gear_approved = null WHERE id = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function approvePcard (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trip_pcard_requests SET is_approved = true WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function denyPcard (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trip_pcard_requests SET is_approved = false WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function resetPcard (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE trip_pcard_requests SET is_approved = null WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}
