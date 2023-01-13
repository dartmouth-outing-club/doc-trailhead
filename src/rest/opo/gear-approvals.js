import * as sqlite from '../../services/sqlite.js'
import * as tripCard from '../trip-card.js'

export function approveVehicleRequest (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE vehiclerequests SET is_approved = true WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function denyVehicleRequest (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE vehiclerequests SET is_approved = false WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
}

export function resetVehicleRequest (req, res) {
  if (!req.params.tripId) return res.sendStatus(400)
  sqlite.run('UPDATE vehiclerequests SET is_approved = null WHERE trip = ?', req.params.tripId)
  tripCard.renderLeaderCard(res, req.params.tripId, req.user)
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
