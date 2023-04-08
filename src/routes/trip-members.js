import * as emails from '../emails.js'
import * as mailer from '../services/mailer.js'
import * as tripCard from '../routes/trip-card.js'
import { _24_HOURS_IN_MS } from '../constants.js'

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

  /**
   * This 3-step process ensures that the newly removed user gets sent to the "back of the line",
   * so they don't get re-auto-approved instantly, allowing
   * the next person in line to be auto-approved.
   */
  // temporarily delete trip_member row
  req.db.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  // auto-approve next person in line
  autoApprove(tripId)(req.db)
  // re-add user to trip_members with pending = 1
  req.db.run('INSERT INTO trip_members (trip, user, leader, pending) VALUES (?, ?, ?, ?)', tripId, userId, 0, 1)

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
    autoApprove(tripId)(req.db)
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

  // check if user was approved
  const { pending } = req.db.get('SELECT pending FROM trip_members WHERE trip = ? and user = ?', tripId, req.user)

  const { changes } = req.db.run('DELETE FROM trip_members WHERE trip = ? and user = ?',
    tripId, req.user)
  if (changes === 0) console.warn(`Unnecessary delete requested for trip ${tripId}`)

  if (!pending) {
    mailer.send(emails.getUserLeftEmail, req.db, tripId, req.user)
    autoApprove(tripId)(req.db)
  }
  return tripCard.renderSignupCard(req, res, tripId, req.user)
}

export function autoApprove (tripId) {
  return (db) => {
    let moreToApprove = true
    while (moreToApprove) {
      // fetch the current member count
      const { count } = db.get('SELECT COUNT(*) as count FROM trip_members WHERE trip = ? AND pending = 0', tripId)
      // fetch the auto_approved_members limit and the trip start time
      const { auto_approved_members, start_time } = db.get('SELECT auto_approved_members, start_time FROM trips WHERE id = ?', tripId)

      if (count < auto_approved_members && start_time - new Date().getTime() > _24_HOURS_IN_MS) {
        // pull the top person from the waitlist
        const waitlist = db.all(`
          SELECT user FROM trip_members
          WHERE trip = ? AND pending = 1
          ORDER BY added_at ASC LIMIT 1
        `, tripId)
        if (waitlist.length > 0) {
          const nextUser = waitlist[0].user
          db.run('UPDATE trip_members SET pending = 0 WHERE trip = ? and user = ?', tripId, nextUser)
          mailer.send(emails.getTripApprovalEmail, db, tripId, nextUser)
        } else {
          moreToApprove = false
        }
      } else {
        moreToApprove = false
      }
    }
  }
}
