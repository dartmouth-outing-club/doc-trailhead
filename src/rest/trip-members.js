import * as sqlite from '../services/sqlite.js'
import * as mailer from '../services/mailer.js'
import * as tripCard from '../views/trip-card.js'

export function makeLeader (req, res) {
  const { tripId, userId } = req.params
  sqlite.run('UPDATE trip_members SET leader = 1 WHERE trip = ? and user = ?', tripId, userId)
  mailer.sendCoLeaderConfirmation(tripId, userId)
  return tripCard.renderLeaderCard(res, tripId, userId)
}

export function demote (req, res) {
  const { tripId, userId } = req.params
  if (req.user === userId) return res.sendStatus(400) // TODO error message
  sqlite.run('UPDATE trip_members SET leader = 0 WHERE trip = ? and user = ?', tripId, userId)
  mailer.sendCoLeaderRemovalNotice(tripId, userId)
  return tripCard.renderLeaderCard(res, tripId, userId)
}

export function admit (req, res) {
  const { tripId, userId } = req.params
  sqlite.run('UPDATE trip_members SET pending = 0 WHERE trip = ? and user = ?', tripId, userId)
  mailer.sendTripApprovalEmail(tripId, userId)
  return tripCard.renderLeaderCard(res, tripId, userId)
}

export function sendToWaitlist (req, res) {
  const { tripId, userId } = req.params
  sqlite.run('UPDATE trip_members SET pending = 1 WHERE trip = ? and user = ?', tripId, userId)
  mailer.sendTripRemovalEmail(tripId, userId)
  return tripCard.renderLeaderCard(res, tripId, userId)
}

export function reject (req, res) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  mailer.sendTripTooFullEmail(tripId, userId)
  return tripCard.renderLeaderCard(res, tripId, req.user)
}

export function signup (req, res) {
  const tripId = req.params.tripId
  if (!tripId) return res.sendStatus(400)

  // Add the trip member if they weren't there before
  const info = sqlite.run(`
    INSERT OR IGNORE INTO trip_members (trip, user, leader, pending)
      VALUES (?, ?, false, true)`, tripId, req.user)

  // Reset the gear data and then add it again
  sqlite.run('DELETE FROM member_gear_requests WHERE trip = ? AND user = ?', tripId, req.user)
  for (const property in req.body) {
    const gearId = parseInt(req.body[property])
    sqlite.run('INSERT INTO member_gear_requests (trip, user, gear) VALUES (?, ?, ?)',
      tripId, req.user, gearId)
  }

  // If the trip member was inserted, that means they just applied,
  // otherwise it means they changed their gear request
  if (info.changes === 1) {
    mailer.sendTripApplicationConfirmation(tripId, req.user)
  } else {
    mailer.sendGearRequestChangedEmail(tripId)
  }

  return tripCard.renderSignupCard(res, tripId, req.user)
}

export function leave (req, res) {
  const tripId = req.params.tripId

  if (!tripId) return res.sendStatus(400)
  const { changes } = sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?',
    tripId, req.user)
  if (changes === 0) console.warn(`Unnecessary delete requested for trip ${tripId}`)

  // TODO only send if user was approved
  mailer.sendUserLeftEmail(tripId, req.user)
  return tripCard.renderSignupCard(res, tripId, req.user)
}
