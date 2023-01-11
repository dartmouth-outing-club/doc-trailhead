import * as sqlite from '../services/sqlite.js'
import * as tripCard from './trip-card.js'

export function get (req, res) {
  const tripId = req.params.id
  const trip = tripCard.getTripCardData(tripId, req.user)
  return res.render('trip.njs', trip)
}

// TODO refactor this with universal validation put individual handlers
function updateTripMembers (req, res, field, value) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite
    .run(`UPDATE trip_members SET ${field} = ${value} WHERE trip = ? and user = ?`, tripId, userId)

  return tripCard.renderTripCard(res, tripId, req.user)
}

export const makeLeader = (req, res) => updateTripMembers(req, res, 'leader', 1)
export const demote = (req, res) => updateTripMembers(req, res, 'leader', 0)
export const admit = (req, res) => updateTripMembers(req, res, 'pending', 0)
export const sendToWaitlist = (req, res) => updateTripMembers(req, res, 'pending', 1)

export function reject (req, res) {
  const { tripId, userId } = req.params
  if (!tripId || !userId || typeof tripId !== 'number' || typeof userId !== 'number') {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  return tripCard.renderTripCard(res, tripId, req.user)
}
