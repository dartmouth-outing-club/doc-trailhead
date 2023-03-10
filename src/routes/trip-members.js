import * as emails from '../emails.js'
import * as mailer from '../services/mailer.js'
import * as tripCard from '../routes/trip-card.js'

export function makeLeader (req, res) {
  const { tripId, userId } = req.params
  req.db.run('UPDATE trip_members SET leader = 1 WHERE trip = ? and user = ?', tripId, userId)
  mailer.send(emails.getCoLeaderConfirmation, req.db, tripId, userId)
  return tripCard.renderLeaderCard(req, res, tripId, userId)
}

export function demote (req, res) {
  const { tripId, userId } = req.params
  // You can't demote yourself to a trippee
  if (req.user === userId) return res.sendStatus(400)
  req.db.run('UPDATE trip_members SET leader = 0 WHERE trip = ? and user = ?', tripId, userId)
  mailer.send(emails.getCoLeaderRemovalNotice, req.db, tripId, userId)
  return tripCard.renderLeaderCard(req, res, tripId, userId)
}

export function admit (req, res) {
  const { tripId, userId } = req.params
  req.db.run('UPDATE trip_members SET pending = 0 WHERE trip = ? and user = ?', tripId, userId)
  mailer.send(emails.getTripApprovalEmail, req.db, tripId, userId)
  return tripCard.renderLeaderCard(req, res, tripId, userId)
}

export function sendToWaitlist (req, res) {
  const { tripId, userId } = req.params

  // Can't send owner to wailist
  const owner = req.db.get('SELECT owner FROM trips WHERE id = ?', tripId).owner
  if (userId === owner) return res.sendStatus(400)

  req.db.run('UPDATE trip_members SET pending = 1 WHERE trip = ? and user = ?', tripId, userId)
  mailer.send(emails.getTripRemovalEmail, req.db, tripId, userId)
  return tripCard.renderLeaderCard(req, res, tripId, userId)
}

export function reject (req, res) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  // Can't remove owner from trip
  const owner = req.db.get('SELECT owner FROM trips WHERE id = ?', tripId).owner
  if (userId === owner) return res.sendStatus(400)

  req.db.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  mailer.send(emails.getTripTooFullEmail, req.db, tripId, userId)
  return tripCard.renderLeaderCard(req, res, tripId, req.user)
}

export function signup (req, res) {
  const tripId = req.params.tripId
  if (!tripId) return res.sendStatus(400)

  // Add the trip member if they weren't there before
  const info = req.db.run(`
    INSERT OR IGNORE INTO trip_members (trip, user, leader, pending)
      VALUES (?, ?, false, true)`, tripId, req.user)

  // Reset the gear data and then add it again
  req.db.run('DELETE FROM member_gear_requests WHERE trip = ? AND user = ?', tripId, req.user)
  for (const property in req.body) {
    const gearId = parseInt(req.body[property])
    req.db.run('INSERT INTO member_gear_requests (trip, user, gear) VALUES (?, ?, ?)',
      tripId, req.user, gearId)
  }

  // If the trip member was inserted, that means they just applied,
  // otherwise it means they changed their gear request
  if (info.changes === 1) {
    mailer.send(emails.getTripApplicationConfirmation, req.db, tripId, req.user)
  } else {
    mailer.send(emails.getGearRequestChangedEmail, req.db, tripId, req.user)
  }

  return tripCard.renderSignupCard(req, res, tripId, req.user)
}

export function leave (req, res) {
  const tripId = req.params.tripId
  const owner = req.db.get('SELECT owner FROM trips WHERE id = ?', tripId).owner

  // Can't leave a trip that you own
  if (!tripId) return res.sendStatus(400)
  if (req.user === owner) return res.sendStatus(400)

  const { changes } = req.db.run('DELETE FROM trip_members WHERE trip = ? and user = ?',
    tripId, req.user)
  if (changes === 0) console.warn(`Unnecessary delete requested for trip ${tripId}`)

  // TODO only send if user was approved
  mailer.send(emails.getUserLeftEmail, req.db, tripId, req.user)
  return tripCard.renderSignupCard(req, res, tripId, req.user)
}
