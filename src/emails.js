import nunjucks from 'nunjucks'

import * as constants from './constants.js'

export function getCheckOutEmail (trip, leaderEmails) {
  return {
    name: 'check-out',
    address: leaderEmails,
    subject: `Trip #${trip.id} is happening soon`,
    message: nunjucks.render('emails/check-out.njk', { trip, constants })
  }
}

export function getCheckInEmail (trip, leaderEmails) {
  return {
    name: 'Check-in',
    address: leaderEmails,
    subject: `Trip #${trip.id} should be returning soon`,
    message: nunjucks.render('emails/check-in.njk', { trip, constants })
  }
}

export function get90MinuteLateEmail (trip, leaderEmails) {
  trip.scheduledReturn = constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')
  return {
    name: '90 minute late',
    address: leaderEmails,
    subject: `Trip #${trip.id} late for return`,
    message: nunjucks.render('emails/90-minute-late.njk', { trip, constants })
  }
}

export function get3HourLateEmail (trip, leaderEmails) {
  trip.scheduledReturn = constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')
  return {
    name: '3 hour late',
    address: constants.OPOEmails.concat(leaderEmails),
    subject: `Trip #${trip.id} not returned`,
    message: nunjucks.render('emails/3-hour-late.njk', { trip, constants })
  }
}

export function getNewTripEmail (db, tripId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  return {
    name: 'New trip',
    address: leaderEmails,
    subject: `New Trip #${tripId} created`,
    message: nunjucks.render('emails/new-trip.njk', { trip, constants })
  }
}

export function getTripDeletedEmail (db, tripId) {
  const trip = db.getTripEmailInfo(tripId)
  return {
    name: 'Trip deleted',
    address: trip.member_emails,
    subject: `Trip #${trip.id} deleted`,
    message: nunjucks.render('emails/trip-deleted.njk', { trip, constants })
  }
}

export function getVehicleRequestProcessedEmail (db, tripId) {
  const leaderEmails = db.getTripLeaderEmails(tripId)
  return {
    name: 'Trip Vehicle Request Processed',
    address: leaderEmails,
    subject: `Trip ${tripId}: Important changes to your vehicle request`,
    message: nunjucks.render('emails/vehicle-request-processed.njk', { tripId, constants })
  }
}

export function getVehicleRequestDeniedEmail (db, vehicleRequestId) {
  const recipients = db.getEmailForVehicleRequest(vehicleRequestId)
  return {
    name: 'Vehicle Request Denied Email',
    address: recipients,
    subject: 'Your vehicle requests got denied',
    message: nunjucks.render('emails/vehicle-request-denied.njk', { vehicleRequestId, constants })
  }
}

export function getGearRequestChangedEmail (db, tripId, userId) {
  const info = db.get(`
    SELECT title, users.name, users.email
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND trip_members.user = ?
  `, tripId, userId)

  const leaderEmails = db.getTripLeaderEmails(tripId)
  return {
    name: 'Gear request changed',
    address: leaderEmails,
    subject: `Trip #${tripId}: ${info.name} changed gear requests`,
    message: nunjucks.render('emails/gear-request-changed.njk', { info, tripId, constants })
  }
}

export function getTripApplicationConfirmation (db, tripId, userId) {
  const info = db.get(`
    SELECT title, users.name, users.email, owner_table.email as owner_email
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    LEFT JOIN users AS owner_table ON trips.owner = users.id
    WHERE trip = ? AND user = ?
  `, tripId, userId)

  return {
    name: 'Trip application confirmation',
    address: info.email,
    subject: "Confirmation: You've applied to go on a trip",
    message: nunjucks.render('emails/trip-application-confirmation.njk', { info, tripId, constants })
  }
}

export function getTripApprovalEmail (db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = db.getTripOwnerEmail(tripId)
  return {
    name: 'Trip approval',
    address: user.email,
    subject: `Trip #${trip.id}: You've been approved! 🙌`,
    message: nunjucks.render('emails/trip-approval.njk', { user, trip, ownerEmail, constants })
  }
}

export function getTripRemovalEmail (db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = db.getTripOwnerEmail(tripId)
  return {
    name: 'Trip removal',
    address: user.email,
    subject: `Trip #${trip.id}: You've been un-admitted`,
    message: nunjucks.render('emails/trip-removal.njk', { trip, user, ownerEmail, constants })
  }
}

export function getTripTooFullEmail (db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = db.getTripOwnerEmail(tripId)
  return {
    name: 'Trip too full',
    address: user.email,
    subject: `Trip #${trip.id}: it's too full`,
    message: nunjucks.render('emails/trip-removal.njk', { trip, user, ownerEmail, constants })
  }
}

export function getUserLeftEmail (db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  return {
    name: 'User left',
    address: leaderEmails,
    subject: `Trip #${tripId}: ${user.name} left your trip`,
    message: nunjucks.render('emails/user-left.njk', { user, trip, constants })
  }
}

export function getCoLeaderConfirmation (db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = db.getTripOwnerEmail(tripId)
  return {
    address: [user.email],
    name: 'Co-leader confirmation',
    subject: `Trip #${trip.id}: you're now a co-leader!`,
    message: nunjucks.render('emails/co-leader-confirmed.njk', { user, trip, ownerEmail, constants })
  }
}

export function getCoLeaderRemovalNotice (db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  return {
    name: 'Co-leader removal',
    address: [user.email],
    subject: `Trip #${trip.id}: co-leader change`,
    message: nunjucks.render('emails/co-leader-removed.njk', { trip, constants })
  }
}

export function getLateTripBackAnnouncement (db, tripId, isBack) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const returnedText = !isBack ? 'NOT' : ''
  return {
    name: 'Late trip returned',
    address: constants.OPOEmails,
    subject: `Trip #${trip.id} ${!isBack ? 'un-' : ''}returned`,
    message: nunjucks.render('emails/late-trip-back.njk', { trip, returnedText, constants })
  }
}

export function getGroupGearStatusUpdate (trip, leaderEmails, message) {
  return {
    name: 'Group gear status update',
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: nunjucks.render('emails/group-gear-update.njk', { trip, message, constants })
  }
}

export function getGearRequiresReapprovalNotice (trip) {
  return {
    name: 'Individual gear changed notice',
    address: constants.gearAdminEmails,
    subject: `Trip #${trip.id}'s gear request changed`,
    message: nunjucks.render('emails/gear-reapproval-notice.njk', { trip, constants })
  }
}

export function getIndividualGearStatusUpdate (trip, leaderEmails, message) {
  return {
    name: 'Individual gear status update',
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: nunjucks.render('emails/individual-gear-status.njk', { trip, message, constants })
  }
}
export function getPCardStatusUpdate (trip, leaderEmails) {
  const statusText = trip.pcardStatus === 'approved' ? 'approved' : 'denied'
  return {
    name: 'Pcard status update',
    address: leaderEmails,
    subject: `Trip #${trip.id}: P-Card request ${statusText}`,
    message: nunjucks.render('emails/pcard-status-update.njk', { trip, statusText, constants })
  }
}

export function getTripGearChangedNotice (trip, leaderEmails) {
  return {
    name: 'Trip gear changed',
    address: leaderEmails,
    subject: `Trip #${trip.id}: Trippee gear requests un-approved`,
    message: nunjucks.render('emails/trip-gear-changed.njk', { trip, constants })
  }
}
