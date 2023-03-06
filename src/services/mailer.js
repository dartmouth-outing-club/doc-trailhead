import nodemailer from 'nodemailer'

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
        await send(emailFunc, trip, leaderEmails)
        markFunc(trip.id)
      } catch (error) {
        console.error(`Failed to send mail for trip ${trip.id}`, error)
      }
    }

    console.log('[Mailer] Finished sending emails')
  }
}

/* Send an email from Trailhead.
 *
 * The first argument is a function that builds an email message, and it takes the remaining
 * arguments as parameters to build that email.
 *
 * Emails should contain the following text fields: name, address, subject, message
 * The name is used for logging purposes, the email content comprises the other three.
 */
export async function send (emailFunc, ...args) {
  const email = emailFunc(...args)

  if (process.env.NODE_ENV !== 'production') {
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
  console.log(`${email.name} email sent: ${info.response}`)
}
