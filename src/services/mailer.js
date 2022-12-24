import nodemailer from 'nodemailer'

import { tokenForUser } from '../controllers/user-controller.js'
import * as constants from '../constants.js'
import * as users from '../controllers/user-controller.js'

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
    const tripsInWindow = await tripsFunc()
    console.log(`[Mailer] Sending emails for ${tripsInWindow.length} trips`)

    // Doing this as a for loop so that it happens entirely sychrnously
    // Otherwise we'll create too many simultaneous connections
    for (const trip of tripsInWindow) {
      try {
        const leaderEmails = await users.getUserEmails(trip.leaders)
        console.log(`[Mailer] Sending ${name} email to: ` + leaderEmails.join(', '))
        const token = tokenForUser(trip.leaders[0], 'mobile', trip._id)
        await emailFunc(trip, leaderEmails, token)
        markFunc(trip.id)
      } catch (error) {
        console.error(`Failed to send mail for trip ${trip._id}`, error)
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

export async function sendCheckOutEmail (trip, leaderEmails, token) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id} is happening soon`,
    message: `Hello,\n\nYour Trip #${trip.id}: ${trip.title} is happening in 48 hours!\n\nHere is a mobile-friendly 📱 URL (open it on your phone) for you to mark all attendees before you leave ${trip.pickup}: ${constants.frontendURL}/trip-check-out/${trip._id}?token=${token}\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Check-out')
}

export async function sendCheckInEmail (trip, leaderEmails, token) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id} should be returning soon`,
    message: `Hello,\n\nYour Trip #${trip.id}: ${trip.title} should return within 2 hours.\n\nHere is a mobile-friendly 📱 URL (open it on your phone) for you to mark a successful return and check-in all trippees when you arrive at ${trip.dropoff}: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${token}\n\nIf an EMERGENCY occured, please get emergency help right away, and follow the link above to mark your status so OPO staff is informed.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Check-in')
}

export async function send90MinuteLateEmail (trip, leaderEmails, token) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id} late for return`,
    message: `Hello,\n\nYour [Trip #${trip.id}: ${trip.title}] is now 90 minutes late. It was scheduled to return at ${constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')}. OPO will be notified in the next 90 minutes if your trip is not back in Hanover. If you are having difficulties getting back, please follow the DOC Emergency Protocols found here:\n\nhttps://docs.google.com/forms/u/1/d/e/1FAIpQLSeo9jIcTGNstZ1uADtovDjJT8kkPtS-YpRwzJC2MZkVkbH0hw/viewform.\n\nIMPORTANT: right after you return, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${token}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, '90 minute late')
}

export async function send3HourLateEmail (trip, leaderEmails) {
  const email = {
    address: constants.OPOEmails.concat(leaderEmails),
    subject: `Trip #${trip.id} not returned`,
    message: `Hello,\n\nYour [Trip #${trip.id}: ${trip.title}], was due back at ${constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')} and has not yet checked back in from Hanover. We have informed OPO staff about your status. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, '3 hour late')
}

export async function sendTripDeletedEmail (trip, ownerEmail, trippeeEmails, reason) {
  const email = {
    address: trippeeEmails,
    subject: `Trip #${trip.id} deleted`,
    message: `Hello,\n\nThe Trip #${trip.id}: ${trip.title} which you have been signed up for (or requested to be on) has been deleted. The original trip leader can be reached at ${ownerEmail}.\n\nReason: ${reason || 'no reason provided.'}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Trip deleted')
}

export async function sendVehicleRequestCreatedEmail (vehicleRequest, recipients) {
  const email = {
    address: recipients,
    subject: `New V-Req #${vehicleRequest.number} created`,
    message: `Hello,\n\nYou've created a new vehicle request, V-Req #${vehicleRequest.number}: ${vehicleRequest.requestDetails}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nThis request is not associated with any trip.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email, 'Vehicle Request Created Email')
}

export async function sendTripVehicleRequestDeletedEmail (trip, leaderEmails, vehicleRequestNum) {
  const email = {
    address: leaderEmails,
    subject: `re: Trip #${trip.id} deleted`,
    message: `Hello,\n\nThe associated vehicle request, V-Req #${vehicleRequestNum}: ${trip.title} that is linked to your Trip #${trip.id} has also been deleted since your trip was deleted. We have informed OPO staff that you will no longer be needing this vehicle.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }
  return send(email, 'Vehicle request deleted')
}

export async function sendTripVehicleRequestProcessedEmail (vehicleRequest, leaderEmails, trip) {
  const email = {
    address: leaderEmails,
    subject: `Trip ${trip.id}: Important changes to your vehicle request`,
    message: `Hello,\n\nYour [Trip #${trip.id}]'s vehicle request has been processed (or changed) by OPO staff. It may have been approved at your requested time, or at a different time assigned by OPO. Therefore, it is important for you to review the V-Req: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }
  return send(email, 'Trip Vehicle Request Processed')
}

export async function sendVehicleRequestProcessedEmail (vehicleRequest, emails) {
  const email = {
    address: emails,
    subject: 'V-Req Update: Important changes to your vehicle request',
    message: `Hello,\n\nYour [V-Req #${vehicleRequest.number}] has been processed (or changed) by OPO staff. It may have been approved at your requested time, or at a different time assigned by OPO. Therefore, it is important for you to review the V-Req: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email, 'Vehicle Request Processed')
}

export async function sendVehicleRequestDeniedEmail (vehicleRequest, emails) {
  const email = {
    address: emails,
    subject: 'Your vehicle requests got denied',
    message: `Hello,\n\nYour [V-Req #${vehicleRequest.number}] has been denied by OPO staff.\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email, 'Vehicle Request Denied Email')
}

export async function sendNewTripEmail (trip, leaderEmails, creator) {
  const email = {
    address: leaderEmails,
    subject: `New Trip #${trip.id} created`,
    message: `Hello,\n\nYou've created a new Trip #${trip.id}: ${trip.title}! You will receive email notifications when trippees sign up.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nHere is a mobile-friendly 📱 URL (open it on your phone) for you to mark all attendees before you leave ${trip.pickup}:: ${constants.frontendURL}/trip-check-out/${trip.id}?token=${tokenForUser(creator.id, 'mobile', trip.id)}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'New trip')
}

export async function sendNewVehicleRequestEmail (trip, leaderEmails, vehicleRequest) {
  const email = {
    address: leaderEmails,
    subject: `re: New Trip #${trip.id} created`,
    message: `Hello,\n\nYou've also created a new vehicle request, V-Req #${vehicleRequest.number}: ${trip.title} that is linked to your Trip #${trip.id}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nThis request is associated with the trip, and is deleted if the trip is deleted.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'New vehicle request')
}

export async function sendVehicleRequestChangedEmail (vehicleRequest) {
  const assignmentsList = vehicleRequest.assignments.map((assignment) => (
    `\t-\t${assignment.assigned_vehicle.name}: ${constants.formatDateAndTime(assignment.assigned_pickupDateAndTime, 'LONG')} to ${constants.formatDateAndTime(assignment.assigned_returnDateAndTime, 'LONG')}\n`
  ))
  const email = {
    address: constants.OPOEmails,
    subject: `V-Req #${vehicleRequest.number} updated`,
    message: `Hello,\n\nThe leaders of V-Req #${vehicleRequest.number} (which was approved) just changed their requested vehicles.\n\nThe original ${vehicleRequest.assignments.length} vehicle assignment${vehicleRequest.assignments.length > 1 ? 's' : ''} now have all been unscheduled.\n\nDeleted assignments:\n${assignmentsList}\n\nYou will have to approve this request again at ${constants.frontendURL}/opo-vehicle-request/${vehicleRequest._id.toString()}.\n\nBest, DOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Vehicle request changed')
}

export async function sendVehicleRequestDeletedEmail (vehicleRequest, leaderEmail, reason) {
  const email = {
    address: [leaderEmail],
    subject: `V-Req #${vehicleRequest.number} deleted`,
    message: `Hello,\n\nYour [V-Req #${vehicleRequest.number}] has been deleted.\n\nReason: ${reason}\n\nBest, DOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Vehicle request deleted')
}

export async function sendVehicleRequestCancelledEmail (vehicleRequest, recipients, cancellerEmail) {
  const email = {
    address: recipients,
    subject: 'Your vehicle requests got cancelled',
    message: `Hello,\n\nYour [V-Req #${vehicleRequest.number}]'s assignments have been cancelled by OPO staff. You can send the staff member who reviewed the request an email at mailto:${cancellerEmail}.\n\nView the vehicle request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email, 'Vehicle request cancelled')
}

export async function sendGearRequestChangedEmail (trip, leaderEmails, user) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: ${user.name} changed gear requests`,
    message: `Hello,\n\nTrippee ${user.name} for [Trip #${trip.id}: ${trip.title}] changed their gear requests. You can reach them at ${user.email}.\n\nView the change here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Gear request changed')
}

export async function sendTripApplicationConfirmation (trip, joiningUser, tripOwnerEmail) {
  const email = {
    address: joiningUser.email,
    subject: 'Confirmation: You\'ve applied to go on a trip',
    message: `Hello ${joiningUser.name},\n\nYou've applied to go on [Trip #${trip.id}: ${trip.title}]. However, this does not mean you have been approved for the trip. If you chose to no longer go on the trip, you can still remove yourself from the waitlist. Only once you receive an email about getting approved for this trip can you attend. \n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nYou can reach the trip leader at ${tripOwnerEmail}.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Trip application confirmation')
}

export async function sendTripApprovalEmail (trip, user, tripOwnerEmail) {
  const email = {
    address: user.email,
    subject: `Trip #${trip.id}: You've been approved! 🙌`,
    message: `Hello ${user.name},\n\nYou've been approved for [Trip #${trip.id}: ${trip.title}]! 🎉\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nYou can reach the trip leader at ${tripOwnerEmail}.\n\nStay Crunchy 🏔,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Trip approval')
}

export async function sendTripRemovalEmail (trip, user, tripOwnerEmail) {
  const email = {
    address: user.email,
    subject: `Trip #${trip.id}: You've been un-admitted`,
    message: `Hello ${user.name},\n\nYou've were previously approved for [Trip #${trip.id}: ${trip.title}], but the leader has put you back into pending status, which means you are not approved to attend this trip 🥺.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nYou can reach the trip leader at ${tripOwnerEmail}.\n\nStay Crunchy 🚵‍♀️,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Trip removal')
}

export async function sendTripTooFullEmail (trip, user, tripOwnerEmail) {
  const email = {
    address: user.email,
    subject: `Trip #${trip.id}: it's too full`,
    message: `Hello ${user.name},\n\nYou signed up for [Trip #${trip.id}: ${trip.title}], but unfortunately it's too full 😢. The leader wasn't able to admit you. \n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nYou can reach the trip leader at ${tripOwnerEmail}.\n\nStay Crunchy 🌲,\nDOC Trailhead Platform\n\nThis is an auto-generated email, please do not reply 🤖.`
  }

  return send(email, 'Trip too full')
}

export async function sendUserLeftEmail (trip, leaderEmails, user) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: ${user.name} left your trip`,
    message: `Hello,\n\nYour approved trippee ${user.name} for [Trip #${trip.id}: ${trip.title}] cancelled for this trip 🙁. You can reach them at ${user.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'User left')
}

export async function sendCoLeaderConfirmation (trip, user) {
  const email = {
    address: [user.email],
    subject: `Trip #${trip.id}: you're now a co-leader!`,
    message: `Hello ${user.name},\n\nCongrats - you've been made a co-leader for [Trip #${trip.id}: ${trip.title}] 👏. You can reach the trip leader at ${trip.owner.email}.\n\nYou can view the trip at ${constants.frontendURL}/trip/${trip._id}\n\nStay Crunchy 🏞,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Co-leader confirmation')
}

export async function sendCoLeaderRemovalNotice (trip, user) {
  const email = {
    address: [user.email],
    subject: `Trip #${trip.id}: co-leader change`,
    message: `Hello,\n\nYou have been removed as a co-leader for [Trip #${trip.id}: ${trip.title}]. You can reach them at ${user.email}.\n\nYou can view the trip at ${constants.frontendURL}/trip/${trip._id}\n\nStay Crunchy ☀️,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Co-leader removal')
}

export async function sendLateTripBackAnnouncement (trip, status, time) {
  const email = {
    address: constants.OPOEmails,
    subject: `Trip #${trip.id} ${!status ? 'un-' : ''}returned`,
    message: `Hello,\n\nTrip #${trip.id}: ${trip.title}, has was marked as LATE, has now been marked as ${!status ? 'NOT' : ''} returned by the leader at ${constants.formatDateAndTime(time)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Late trip returned')
}

export async function sendGroupGearStatusUpdate (trip, leaderEmails, message) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: `Hello,\n\nYour Trip #${trip.id}: ${trip.title}'s group gear requests ${message} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Group gear status update')
}

export async function sendGearRequiresReapprovalNotice (trip) {
  const email = {
    address: constants.gearAdminEmails,
    subject: `Trip #${trip.id}'s gear request changed`,
    message: `Hello,\n\nTrip #${trip.id}: ${trip.title}'s gear requests had been originally approved, but they recently made changes to their trippee gear requests because a new trippee was admitted to the trip.\n\nPlease re-approve their request at: ${constants.frontendURL}/approve-trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Individual gear changed notice')
}

export async function sendIndividualGearStatusUpdate (trip, leaderEmails, message) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: Gear requests ${message}`,
    message: `Hello,\n\nYour Trip #${trip.id}: ${trip.title}'s trippee (not group) gear requests ${message} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Individual gear status update')
}
export async function sendPCardStatusUpdate (trip, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: P-Card requests got ${trip.pcardStatus === 'approved' ? 'approved!' : 'denied'}`,
    message: `Hello,\n\nYour Trip #${trip.id}: ${trip.title} has gotten its P-Card requests ${trip.pcardStatus === 'approved' ? 'approved' : 'denied'} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email)
}

export function sendTripGearChangedNotice (trip, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.id}: Trippee gear requests un-approved`,
    message: `Hello,\n\nYour [Trip #${trip.id}: ${trip.title}]'s trippee (not group) gear requests was originally approved by OPO staff, but since a new trippee was admitted who requested additional gear, it has automatically been sent back to review to OPO staff to ensure we have enough.\nCurrently, your trip's status has been changed back to pending, and you should await re-approval before heading out.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email)
}
