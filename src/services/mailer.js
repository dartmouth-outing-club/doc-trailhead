import nodemailer from 'nodemailer'
import nunjucks from 'nunjucks'

import * as constants from '../constants.js'
import * as sqlite from '../services/sqlite.js'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD
  }
})

/**
 * Create a function that can be run on a schedule to send emails.
 *
 * We have certain emails that need to be sent out regularly to check in with the status of
 * various trips. This function creates a new function that can be run on a schedule to
 * accomplish that for each of the different types of emails we need to send. The reason
 * for the mildly complex currying here is that we have to be careful about how we send the
 * emails, since there is a limit on the number of concurrent connections that we can
 * establish with the Office365 email servers.
 *
 * The functions created here will send each of the emails synchronously, but won't block
 * the event loop waiting for each one. This would be suboptimal for an API (it takes
 * a minute), but is totally reasonable for a scheduled email, where reliability is key and
 * a difference of minutes is totally unnoticable to the user.
 */
export function createRecurringEmailSender (name, tripsFunc, emailFunc, markFunc) {
  return async () => {
    const tripsInWindow = tripsFunc()
    console.log(`[Mailer] Sending emails for ${tripsInWindow.length} trips`)

    // Doing this as a for loop so that it happens entirely sychrnously
    // Otherwise we'll create too many simultaneous connections
    for (const trip of tripsInWindow) {
      try {
        const leaderEmails = sqlite.getTripLeaderEmails(trip.id)
        console.log(`[Mailer] Sending ${name} email to: ` + leaderEmails.join(', '))
        await emailFunc(trip, leaderEmails)
        markFunc(trip.id)
      } catch (error) {
        console.error(`Failed to send mail for trip ${trip.id}`, error)
      }
    }

    console.log('[Mailer] Finished sending emails')
  }
}

export async function send (email, emailName) {
  if (process.env.MAILER_STATUS === 'disabled') {
    console.log('The following email was queued:')
    console.log(email)
    return undefined
  }

  const mailOptions = {
    from: 'doc.signup.no.reply@dartmouth.edu',
    to: email.address,
    subject: `${email.subject}${process.env.NODE_ENV === 'development' ? ' | DEV' : ''}`,
    bcc: ['ziray.hao@dali.dartmouth.edu'],
    text: email.message
  }

  const info = await transporter.sendMail(mailOptions)
  console.log(`${emailName} email sent: ${info.response}`)
}

export async function sendCheckOutEmail (trip, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id} is happening soon`,
    message: nunjucks.render('emails/check-out.njk', { trip, constants })
  }

  return send(email, 'Check-out')
}

export async function sendCheckInEmail (trip, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id} should be returning soon`,
    message: nunjucks.render('emails/check-in.njk', { trip, constants })
  }

  return send(email, 'Check-in')
}

export async function send90MinuteLateEmail (trip, leaderEmails) {
  trip.scheduledReturn = constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id} late for return`,
    message: nunjucks.render('emails/90-minute-late.njk', { trip, constants })
  }

  return send(email, '90 minute late')
}

export async function send3HourLateEmail (trip, leaderEmails) {
  trip.scheduledReturn = constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')
  const email = {
    address: constants.OPOEmails.concat(leaderEmails),
    subject: `Trip #${trip.id} not returned`,
    message: nunjucks.render('emails/3-hour-late.njk', { trip, constants })
  }

  return send(email, '3 hour late')
}

export async function sendNewTripEmail (id, title, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `New Trip #${id} created`,
    message: nunjucks.render('emails/new-trip.njk', { id, title })
  }

  return send(email, 'New trip')
}

export async function sendTripDeletedEmail (id, title, ownerEmail, memberEmails) {
  const email = {
    address: memberEmails,
    subject: `Trip #${id} deleted`,
    message: nunjucks.render('emails/trip-deleted.njk', { id, title, ownerEmail })
  }

  return send(email, 'Trip deleted')
}

export async function sendTripVehicleRequestProcessedEmail (tripId) {
  const leaderEmails = sqlite.getTripLeaderEmails(tripId)
  const email = {
    address: leaderEmails,
    subject: `Trip ${tripId}: Important changes to your vehicle request`,
    message: nunjucks.render('emails/vehicle-request-processed.njk', { tripId, constants })
  }
  return send(email, 'Trip Vehicle Request Processed')
}

export async function sendVehicleRequestDeniedEmail (vehicleRequestId) {
  const recipients = sqlite.getEmailForVehicleRequest(vehicleRequestId)
  const email = {
    address: recipients,
    subject: 'Your vehicle requests got denied',
    message: nunjucks.render('emails/vehicle-request-denied.njk', { vehicleRequestId, constants })
  }

  send(email, 'Vehicle Request Denied Email')
}

// export async function sendVehicleRequestChangedEmail (vehicleRequest) {
//   const assignmentsList = vehicleRequest.assignments.map((assignment) => (
//     `\t-\t${assignment.assigned_vehicle.name}: ${constants.formatDateAndTime(assignment.assigned_pickupDateAndTime, 'LONG')} to ${constants.formatDateAndTime(assignment.assigned_returnDateAndTime, 'LONG')}\n`
//   ))
//   const email = {
//     address: constants.OPOEmails,
//     subject: `V-Req #${vehicleRequest.id} updated`,
//     message: `Hello,\n\nThe leaders of V-Req #${vehicleRequest.id} (which was approved) just changed their requested vehicles.\n\nThe original ${vehicleRequest.assignments.length} vehicle assignment${vehicleRequest.assignments.length > 1 ? 's' : ''} now have all been unscheduled.\n\nDeleted assignments:\n${assignmentsList}\n\nYou will have to approve this request again at ${constants.frontendURL}/opo-vehicle-request/${vehicleRequest.id.toString()}.\n\nBest, DOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
//   }
//   return send(email, 'Vehicle request changed')
// }

export async function sendGearRequestChangedEmail (tripId, userId) {
  const info = sqlite.get(`
    SELECT title, users.name, users.email
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND trip_members.user = ?
  `, tripId, userId)

  const leaderEmails = sqlite.getTripLeaderEmails(tripId)
  const email = {
    address: leaderEmails,
    subject: `Trip #${tripId}: ${info.name} changed gear requests`,
    message: nunjucks.render('emails/gear-request-changed.njk', { info, tripId, constants })
  }

  return send(email, 'Gear request changed')
}

export async function sendTripApplicationConfirmation (tripId, userId) {
  const info = sqlite.get(`
    SELECT title, users.name, users.email, owner_table.email as owner_email
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    LEFT JOIN users AS owner_table ON trips.owner = users.id
    WHERE trip = ? AND user = ?
  `, tripId, userId)

  const email = {
    address: info.email,
    subject: "Confirmation: You've applied to go on a trip",
    message: nunjucks.render('emails/trip-application-confirmation.njk', { info, tripId, constants })
  }

  return send(email, 'Trip application confirmation')
}

export async function sendTripApprovalEmail (tripId, userId) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = sqlite.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = sqlite.getTripOwnerEmail(tripId)
  const email = {
    address: user.email,
    subject: `Trip #${trip.id}: You've been approved! 🙌`,
    message: nunjucks.render('emails/trip-approval.njk', { user, trip, ownerEmail, constants })
  }

  return send(email, 'Trip approval')
}

export async function sendTripRemovalEmail (tripId, userId) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = sqlite.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = sqlite.getTripOwnerEmail(tripId)
  const email = {
    address: user.email,
    subject: `Trip #${trip.id}: You've been un-admitted`,
    message: nunjucks.render('emails/trip-removal.njk', { trip, user, ownerEmail, constants })
  }

  return send(email, 'Trip removal')
}

export async function sendTripTooFullEmail (tripId, userId) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = sqlite.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = sqlite.getTripOwnerEmail(tripId)
  const email = {
    address: user.email,
    subject: `Trip #${trip.id}: it's too full`,
    message: nunjucks.render('emails/trip-removal.njk', { trip, user, ownerEmail, constants })
  }

  return send(email, 'Trip too full')
}

export async function sendUserLeftEmail (tripId, userId) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = sqlite.get('SELECT name, email FROM users WHERE id = ?', userId)
  const leaderEmails = sqlite.getTripLeaderEmails(tripId)
  const email = {
    address: leaderEmails,
    subject: `Trip #${tripId}: ${user.name} left your trip`,
    message: nunjucks.render('emails/user-left.njk', { user, trip, constants })
  }

  return send(email, 'User left')
}

export async function sendCoLeaderConfirmation (tripId, userId) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = sqlite.get('SELECT name, email FROM users WHERE id = ?', userId)
  const ownerEmail = sqlite.getTripOwnerEmail(tripId)
  const email = {
    address: [user.email],
    subject: `Trip #${trip.id}: you're now a co-leader!`,
    message: nunjucks.render('emails/co-leader-confirmed.njk', { user, trip, ownerEmail, constants })
  }

  return send(email, 'Co-leader confirmation')
}

export async function sendCoLeaderRemovalNotice (tripId, userId) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const user = sqlite.get('SELECT name, email FROM users WHERE id = ?', userId)
  const email = {
    address: [user.email],
    subject: `Trip #${trip.id}: co-leader change`,
    message: nunjucks.render('emails/co-leader-removed.njk', { trip, constants })
  }

  return send(email, 'Co-leader removal')
}

export async function sendLateTripBackAnnouncement (tripId, isBack) {
  const trip = sqlite.get('SELECT id, title FROM trips WHERE id = ?', tripId)
  const returnedText = !isBack ? 'NOT' : ''
  const email = {
    address: constants.OPOEmails,
    subject: `Trip #${trip.id} ${!isBack ? 'un-' : ''}returned`,
    message: nunjucks.render('emails/late-trip-back.njk', { trip, returnedText, constants })
  }

  return send(email, 'Late trip returned')
}

export async function sendGroupGearStatusUpdate (trip, leaderEmails, message) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: nunjucks.render('emails/group-gear-update.njk', { trip, message, constants })
  }

  return send(email, 'Group gear status update')
}

export async function sendGearRequiresReapprovalNotice (trip) {
  const email = {
    address: constants.gearAdminEmails,
    subject: `Trip #${trip.id}'s gear request changed`,
    message: nunjucks.render('emails/gear-reapproval-notice.njk', { trip, constants })
  }

  return send(email, 'Individual gear changed notice')
}

export async function sendIndividualGearStatusUpdate (trip, leaderEmails, message) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: nunjucks.render('emails/individual-gear-status.njk', { trip, message, constants })
  }

  return send(email, 'Individual gear status update')
}
export async function sendPCardStatusUpdate (trip, leaderEmails) {
  const statusText = trip.pcardStatus === 'approved' ? 'approved' : 'denied'
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: P-Card request ${statusText}`,
    message: nunjucks.render('emails/pcard-status-update.njk', { trip, statusText, constants })
  }

  return send(email)
}

export function sendTripGearChangedNotice (trip, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: Trippee gear requests un-approved`,
    message: nunjucks.render('emails/trip-gear-changed.njk', { trip, constants })
  }

  return send(email)
}
