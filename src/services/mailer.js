import * as identity from '@azure/identity'
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js'
import { Client } from '@microsoft/microsoft-graph-client'

const OFFICE_TENANT_ID = process.env.OFFICE_TENANT_ID
const OFFICE_CLIENT_ID = process.env.OFFICE_CLIENT_ID
const OFFICE_CLIENT_SECRET = process.env.OFFICE_CLIENT_SECRET

let msGraphClient
if (process.env.NODE_ENV !== 'development') {
  // This used to be a very nice and simple SMTP integration but I was forced off it (and doubled the
  // dependency graph) because of Microsoft's SMTP and Basic Auth deprecration.
  // Very irritating and obnoxious!
  const credential = new identity.ClientSecretCredential(
    OFFICE_TENANT_ID, OFFICE_CLIENT_ID, OFFICE_CLIENT_SECRET
  )
  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default']
  })
  msGraphClient = Client.initWithMiddleware({ authProvider })
}

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
export function createRecurringEmailSender(emailName, db, emailFunc) {
  return async() => {
    const emails = emailFunc(db)
    console.log(`[Mailer] Sending emails for ${emails.length} trips`)

    // Doing this as a for loop so that it happens entirely sychrnously
    // Otherwise we'll create too many simultaneous connections
    for (const email of emails) {
      try {
        console.log(`[Mailer] Sending ${emailName} email to: ${email.address}`)
        await sendEmail(email)
        if (emailName === 'LATE_180') {
          markTripLate(db, email.trip)
        } else {
          markTripEmailSent(db, email.trip, emailName)
        }
      } catch (error) {
        console.error(`Failed to send mail for trip ${email.trip}`, error)
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
export async function send(emailFunc, ...args) {
  const email = emailFunc(...args)
  return sendEmail(email)
}

export async function sendBuiltEmail(email) {
  return sendEmail(email)
}

const DARTMOUTH_EMAIL_RE = /@dartmouth\.edu$/i

async function sendEmail(email) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('The following email was queued:')
    console.log(email)
    return undefined
  }

  // Convert the recipients array to the format that Microsoft expects
  console.log(`Recipients before mailing: ${email.address}`)
  const toRecipients =
    (Array.isArray(email.address) ? email.address : [email.address])
      // TODO start using NetID for email
      // For now, only send to Dartmouth emails
      .filter(address => DARTMOUTH_EMAIL_RE.test(address))
      .map(address => { return { emailAddress: { address } } })

  const sendMail = {
    message: {
      subject: email.subject,
      body: { contentType: 'Text', content: email.message },
      toRecipients
    },
    saveToSentItems: 'false'
  }

  try {
    await msGraphClient
      .api('/users/f004vmv@dartmouth.edu/sendMail')
      .post(sendMail)
    console.log(`${email.name} email sent successfully to ${toRecipients}`)
  } catch (err) {
    console.log(`Failed to send email ${email.name} due to err:`)
    console.log(err)
  }
}

function markTripEmailSent(db, tripId, emailName) {
  try {
    return db.run(`
      UPDATE trips
      SET sent_emails = json_insert(sent_emails, '$[#]', ?)
      WHERE id = ?
  `, emailName, tripId)
  } catch (error) {
    console.error(`Error updating email status ${emailName} for trip ${tripId}:`, error)
  }
}

function markTripLate(db, tripId) {
  try {
    markTripEmailSent(db, tripId, 'LATE_180')
    return db.run('UPDATE trips SET marked_late = true WHERE id = ?', tripId)
  } catch (error) {
    console.error(`Error updating marking trip ${tripId} late:`, error)
  }
}
