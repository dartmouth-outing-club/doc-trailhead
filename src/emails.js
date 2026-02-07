import nunjucks from 'nunjucks'

import * as constants from './constants.js'

const _48_HOURS_IN_MS = 172800000
const _1_HOUR_IN_MS = 3600000
const _2_HOURS_IN_MS = 7200000

export function deploymentSuccessEmail() {
  return {
    name: 'Deployment succeeded',
    address: constants.deploymentEmails,
    subject: 'Deployment succeeded',
    message: 'Finished deploying trailhead'
  }
}

export function getTripDeletedEmail(db, tripId) {
  const trip = db.getTripEmailInfo(tripId)
  return {
    name: 'Trip Deleted',
    address: trip.member_emails,
    subject: `Trip #${trip.id} deleted`,
    message: nunjucks.render('emails/trip-deleted.njk', { trip, constants })
  }
}

export function getTripDeletedGearUpdateEmail(trip) {
  return {
    name: 'Trip Deleted (Gear Notice)',
    address: constants.gearAdminEmails,
    subject: `Trip ${trip.id} with gear requests was deleted`,
    message: nunjucks.render('emails/trip-deleted-gear-notification.njk', { trip })
  }
}

export function getVehicleRequestProcessedEmail(db, tripId) {
  const leaderEmails = db.getTripLeaderEmails(tripId)
  return {
    name: 'Trip Vehicle Request Processed',
    address: leaderEmails,
    subject: `Trip ${tripId}: Important changes to your vehicle request`,
    message: nunjucks.render('emails/vehicle-request-processed.njk', { tripId, constants })
  }
}

export function getVehicleRequestDeniedEmail(db, vehicleRequestId) {
  const recipients = db.getEmailForVehicleRequest(vehicleRequestId)
  return {
    name: 'Vehicle Request Denied Email',
    address: recipients,
    subject: 'Your vehicle requests got denied',
    message: nunjucks.render('emails/vehicle-request-denied.njk', { vehicleRequestId, constants })
  }
}

export function getGearRequestChangedEmail(db, tripId, userId) {
  const info = db.get(`
    SELECT title, users.name, users.email
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND trip_members.user = ?
  `, tripId, userId)

  const trip = db.get('SELECT member_gear_approved FROM trips WHERE id = ?', tripId)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  const address = trip.member_gear_approved ? [...leaderEmails, ...constants.gearAdminEmails] : leaderEmails

  return {
    name: 'Gear request changed',
    address,
    subject: `Trip #${tripId}: ${info.name} changed gear requests`,
    message: nunjucks.render('emails/gear-request-changed.njk', { info, tripId, constants })
  }
}

export function getTripApprovalEmail(db, tripId, userId) {
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

export function getTripRemovalEmail(db, tripId, userId) {
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

export function getTripTooFullEmail(db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = db.getTripOwnerEmail(tripId)
  return {
    name: 'Trip too full',
    address: user.email,
    subject: `Trip #${trip.id}: it's too full`,
    message: nunjucks.render('emails/trip-too-full.njk', { trip, user, ownerEmail, constants })
  }
}

export function getUserLeftEmail(db, tripId, userId) {
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

export function getCoLeaderConfirmation(db, tripId, userId) {
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

export function getCoLeaderRemovalNotice(db, tripId, userId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = db.get('SELECT name, email FROM users WHERE id = ?', userId)
  return {
    name: 'Co-leader removal',
    address: [user.email],
    subject: `Trip #${trip.id}: co-leader change`,
    message: nunjucks.render('emails/co-leader-removed.njk', { trip, constants })
  }
}

export function getLateTripBackAnnouncement(db, tripId, isBack) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const returnedText = !isBack ? 'NOT' : ''
  return {
    name: 'Late trip returned',
    address: constants.OPOEmails,
    subject: `Trip #${trip.id} ${!isBack ? 'un-' : ''}returned`,
    message: nunjucks.render('emails/late-trip-back.njk', { trip, returnedText, constants })
  }
}

export function getGroupGearStatusUpdate(trip, leaderEmails, message) {
  return {
    name: 'Group gear status update',
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: nunjucks.render('emails/group-gear-update.njk', { trip, message, constants })
  }
}

export function getGearRequiresReapprovalNotice(trip) {
  return {
    name: 'OPO gear re-approval requested',
    address: constants.gearAdminEmails,
    subject: `Trip #${trip.id}'s gear request changed`,
    message: nunjucks.render('emails/gear-reapproval-notice.njk', { trip, constants })
  }
}

export function getIndividualGearStatusUpdate(trip, leaderEmails, message) {
  return {
    name: 'Individual gear status update',
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: nunjucks.render('emails/individual-gear-status.njk', { trip, message, constants })
  }
}
export function getPCardStatusUpdate(trip, leaderEmails) {
  const statusText = trip.pcardStatus === 'approved' ? 'approved' : 'denied'
  return {
    name: 'Pcard status update',
    address: leaderEmails,
    subject: `Trip #${trip.id}: P-Card request ${statusText}`,
    message: nunjucks.render('emails/pcard-status-update.njk', { trip, statusText, constants })
  }
}

export function getTripGearChangedNotice(db, tripId) {
  const trip = db.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const leaderEmails = db.getTripLeaderEmails(tripId)
  return {
    name: 'Trip gear changed',
    address: leaderEmails,
    subject: `Trip #${trip.id}: Trippee gear requests un-approved`,
    message: nunjucks.render('emails/trip-gear-changed.njk', { trip, constants })
  }
}

export function getEmailsForTripsPendingCheckOut(db) {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _48_HOURS_IN_MS)
  const trips = db.all(`
    SELECT *
    FROM trips
    WHERE start_time > ? AND start_time < ? AND sent_emails NOT LIKE '%CHECK_OUT%'
  `, now.getTime(), emailWindow.getTime())

  const emails = trips.map(trip => {
    const leaderEmails = db.getTripLeaderEmails(trip.id)
    return {
      trip: trip.id,
      name: 'check-out',
      address: leaderEmails,
      subject: `Trip #${trip.id} is happening soon`,
      message: nunjucks.render('emails/check-out.njk', { trip, constants })
    }
  })
  return emails
}

export function getEmailsForTripsPendingCheckIn(db) {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _2_HOURS_IN_MS)
  const trips = db.all(`
    SELECT *
    FROM trips
    WHERE end_time > ? AND end_time < ? AND sent_emails NOT LIKE '%CHECK_IN%'
  `, now.getTime(), emailWindow.getTime())

  const emails = trips.map(trip => {
    const leaderEmails = db.getTripLeaderEmails(trip.id)
    return {
      trip: trip.id,
      name: 'Check-in',
      address: leaderEmails,
      subject: `Trip #${trip.id} should be returning soon`,
      message: nunjucks.render('emails/check-in.njk', { trip, constants })
    }
  })
  return emails
}

export function getEmailsForFirstLateWarning(db) {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _1_HOUR_IN_MS)
  // LATE_90 obviously no longer accurately describes what this email is
  // I could change it but that require a database migration that isn't worth doing at this time
  const trips = db.all(`
    SELECT *
    FROM trips
    WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_90%'
  `, returnWindow.getTime())

  const emails = trips.map(trip => {
    const leaderEmails = db.getTripLeaderEmails(trip.id)
    trip.scheduledReturn = constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')
    return {
      trip: trip.id,
      name: 'Late first warning',
      address: leaderEmails,
      subject: `Trip #${trip.id} late for return`,
      message: nunjucks.render('emails/late-first-warning.njk', { trip, constants })
    }
  })
  return emails
}

export function getEmailsForSecondLateWarning(db) {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _2_HOURS_IN_MS)
  const trips = db.all(`
    SELECT *
    FROM trips
    WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_180%'
  `, returnWindow.getTime())
  const emails = trips.map(trip => {
    const leaderEmails = db.getTripLeaderEmails(trip.id)
    trip.scheduledReturn = constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')
    return {
      trip: trip.id,
      name: 'Late second warning',
      address: constants.OPOEmails.concat(leaderEmails),
      subject: `Trip #${trip.id} not returned`,
      message: nunjucks.render('emails/late-second-warning.njk', { trip, constants })
    }
  })
  return emails
}
