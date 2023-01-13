import * as sqlite from '../services/sqlite.js'
import * as tripCard from './trip-card.js'

// TODO refactor this with universal validation but individual handlers
function updateTripMembers (req, res, field, value) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite
    .run(`UPDATE trip_members SET ${field} = ${value} WHERE trip = ? and user = ?`, tripId, userId)

  return tripCard.renderLeaderCard(res, tripId, req.user)
}

export const makeLeader = (req, res) => updateTripMembers(req, res, 'leader', 1)
export const demote = (req, res) => updateTripMembers(req, res, 'leader', 0)
export const admit = (req, res) => updateTripMembers(req, res, 'pending', 0)
export const sendToWaitlist = (req, res) => updateTripMembers(req, res, 'pending', 1)

export function reject (req, res) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  return tripCard.renderLeaderCard(res, tripId, req.user)
}

export function signup (req, res) {
  const tripId = req.params.tripId
  if (!tripId) return res.sendStatus(400)

  sqlite.run(`
    INSERT OR REPLACE INTO trip_members (trip, user, leader, pending)
      VALUES (?, ?, false, false)`, tripId, req.user)

  for (const property in req.body) {
    const gearId = parseInt(req.body[property])
    sqlite.run('INSERT INTO member_gear_requests (trip, user, gear) VALUES (?, ?, ?)',
      tripId, req.user, gearId)
  }

  return tripCard.renderSignupCard(res, tripId, req.user)
}

export function leave (req, res) {
  const tripId = req.params.tripId

  if (!tripId) return res.sendStatus(400)
  const { changes } = sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?',
    tripId, req.user)
  if (changes === 0) console.warn(`Unnecessary delete requested for trip ${tripId}`)
  return tripCard.renderSignupCard(res, tripId, req.user)
}
