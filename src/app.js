import cron from 'node-cron'
import * as emails from './emails.js'
import * as server from './server.js'
import * as mailer from './services/mailer.js'
import * as sessions from './services/sessions.js'

import TrailheadDatabaseConnection from './services/sqlite.js'

const isTest = process.env.NODE_ENV === 'TESTS'

const databaseFp = 'trailhead.db'
const trailheadDb = new TrailheadDatabaseConnection(databaseFp)
sessions.start(`sessions${isTest ? '' : ''}.db`)

process.on('exit', () => {
  trailheadDb.stop()
  sessions.stop()
})
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))

server.startServer(trailheadDb, 8080)

// Create and schedule time-based emails
// =============================================================================
const checkOutEmails = mailer.createRecurringEmailSender('CHECK_OUT',
  trailheadDb, emails.getEmailsForTripsPendingCheckOut)

const checkInEmails = mailer.createRecurringEmailSender('CHECK_IN',
  trailheadDb, emails.getEmailsForTripsPendingCheckIn)

const firstWarningEmails = mailer.createRecurringEmailSender('LATE_90',
  trailheadDb, emails.getEmailsForFirstLateWarning)

const secondWarningEmails = mailer.createRecurringEmailSender('LATE_180',
  trailheadDb, emails.getEmailsForSecondLateWarning)

// These wacky times are a stopgap to mitigate the connection limit throttling
// I'll batch these properly (with precise queries) soon
console.log('Starting scheduler')
cron.schedule('10 * * * *', checkOutEmails)
cron.schedule('20 * * * *', checkInEmails)
cron.schedule('5,15,25,35,45,55 * * * *', firstWarningEmails)
cron.schedule('17,37,57 * * * *', secondWarningEmails)
