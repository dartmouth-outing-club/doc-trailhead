import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

import { tokenForUser } from '../controllers/user-controller.js'
import * as constants from '../constants.js'
import * as users from '../controllers/user-controller.js'

dotenv.config({ silent: true })

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
      const leaderEmails = await users.getUserEmails(trip.leaders)
      console.log(`[Mailer] Sending ${name} email to: ` + leaderEmails.join(', '))
      const token = tokenForUser(trip.leaders[0], 'mobile', trip._id)
      try {
        await emailFunc(trip, leaderEmails, token)
        markFunc(trip)
      } catch (error) {
        console.error(`Failed to send mail for trip ${trip._id}`, error)
      }
    }

    console.log('[Mailer] Finished sending emails')
  }
}

export async function send (email, emailName) {
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
    subject: `Trip #${trip.number} is happening soon`,
    message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title} is happening in 48 hours!\n\nHere is a mobile-friendly 📱 URL (open it on your phone) for you to mark all attendees before you leave ${trip.pickup}: ${constants.frontendURL}/trip-check-out/${trip._id}?token=${token}\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Check-out')
}

export async function sendCheckInEmail (trip, leaderEmails, token) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.number} should be returning soon`,
    message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title} should return within 2 hours.\n\nHere is a mobile-friendly 📱 URL (open it on your phone) for you to mark a successful return and check-in all trippees when you arrive at ${trip.dropoff}: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${token}\n\nIf an EMERGENCY occured, please get emergency help right away, and follow the link above to mark your status so OPO staff is informed.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Check-in')
}

export async function send90MinuteLateEmail (trip, leaderEmails, token) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.number} late for return`,
    message: `Hello,\n\nYour [Trip #${trip.number}: ${trip.title}] is now 90 minutes late. It was scheduled to return at ${constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')}. OPO will be notified in the next 90 minutes if your trip is not back in Hanover. If you are having difficulties getting back, please follow the DOC Emergency Protocols found here:\n\nhttps://docs.google.com/forms/u/1/d/e/1FAIpQLSeo9jIcTGNstZ1uADtovDjJT8kkPtS-YpRwzJC2MZkVkbH0hw/viewform.\n\nIMPORTANT: right after you return, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${token}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, '90 minute late')
}

export async function send3HourLateEmail (trip, leaderEmails) {
  const email = {
    address: leaderEmails,
    subject: `Trip #${trip.number} not returned`,
    message: `Hello,\n\nYour [Trip #${trip.number}: ${trip.title}], was due back at ${constants.formatDateAndTime(trip.endDateAndTime, 'SHORT')} and has not yet checked back in from Hanover. We have informed OPO staff about your status. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, '3 hour late')
}

export async function sendTripDeletedEmail (trip, ownerEmail, trippeeEmails, reason) {
  const email = {
    address: trippeeEmails,
    subject: `Trip #${trip.number} deleted`,
    message: `Hello,\n\nThe Trip #${trip.number}: ${trip.title} which you have been signed up for (or requested to be on) has been deleted. The original trip leader can be reached at ${ownerEmail}.\n\nReason: ${reason || 'no reason provided.'}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  return send(email, 'Trip deleted')
}

export async function sendVehicleRequestDeletedEmail (trip, leaderEmails, vehicleRequestNum) {
  const email = {
    address: leaderEmails,
    subject: `re: Trip #${trip.number} deleted`,
    message: `Hello,\n\nThe associated vehicle request, V-Req #${vehicleRequestNum}: ${trip.title} that is linked to your Trip #${trip.number} has also been deleted since your trip was deleted. We have informed OPO staff that you will no longer be needing this vehicle.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }
  send(email, 'Vehicle requested deleted')
}

export async function sendNewTripEmail (trip, leaderEmails, creator) {
  const email = {
    address: leaderEmails,
    subject: `New Trip #${trip.number} created`,
    message: `Hello,\n\nYou've created a new Trip #${trip.number}: ${trip.title}! You will receive email notifications when trippees sign up.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nHere is a mobile-friendly 📱 URL (open it on your phone) for you to mark all attendees before you leave ${trip.pickup}:: ${constants.frontendURL}/trip-check-out/${trip._id}?token=${tokenForUser(creator._id, 'mobile', trip._id)}\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email, 'New trip')
}

export async function sendNewVehicleRequestEmail (trip, leaderEmails, vehicleRequest) {
  const email = {
    address: leaderEmails,
    subject: `re: New Trip #${trip.number} created`,
    message: `Hello,\n\nYou've also created a new vehicle request, V-Req #${vehicleRequest.number}: ${trip.title} that is linked to your Trip #${trip.number}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nThis request is associated with the trip, and is deleted if the trip is deleted.\n\nBest,\nDOC Trailhead Platform\n\nThis email was generated with 💚 by the Trailhead-bot 🤖, but it cannot respond to your replies.`
  }

  send(email, 'New vehicle request')
}
