import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import cron from 'node-cron'
import morgan from 'morgan'

import * as constants from './constants.js'
import * as db from './services/sqlite.js'
import * as mailer from './services/mailer.js'
import apiRouter from './router.js'

process.env.TZ = 'America/New_York'

const app = express()

app.use(cors())

// enable/disable http request logging
app.use(morgan('dev'))

// enable only if you want static assets from folder static
app.use(express.static('static'))

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use('/', apiRouter)
app.use(handleError)

// Open database connection
db.start('trailhead.db')
process.on('exit', () => db.stop())
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090
app.listen(port)
console.log(`Server running at ${process.env.NODE_ENV !== 'development' ? constants.backendURL : 'localhost'}:${port}`)
console.error(`Starting up at ${new Date()}`)

const checkOutEmails = mailer.createRecurringEmailSender('trip check-out',
  db.getTripsPendingCheckOutEmail, mailer.sendCheckOutEmail, db.markCheckOutEmail)

const checkInEmails = mailer.createRecurringEmailSender('trip check-in',
  db.getTripsPendingCheckInEmail, mailer.sendCheckInEmail, db.markCheckInEmail)

const late90MinEmails = mailer.createRecurringEmailSender('trip late 90 minutes',
  db.getTripsPending90MinEmail, mailer.send90MinuteLateEmail, db.mark90MinEmail)

const late3HourEmails = mailer.createRecurringEmailSender('trip late 3 hours',
  db.getTripsPending3HourEmail, mailer.send3HourLateEmail, db.markTripLate)

/**
 * Schedules time-based emails.
 */
if (process.env.NODE_ENV !== 'development' && process.env.SCHEDULER_STATUS !== 'disabled') {
  // These wacky times are a stopgap to mitigate the connection limit throttling
  // I'll batch these properly (with precise queries) soon
  console.log('Starting scheduler')
  cron.schedule('0 1 * * *', db.markOldTripsAsPast)
  cron.schedule('10 * * * *', checkOutEmails)
  cron.schedule('20 * * * *', checkInEmails)
  cron.schedule('5,15,25,35,45,55 * * * *', late90MinEmails)
  cron.schedule('17,37,57 * * * *', late3HourEmails)
} else {
  console.log('Scheduler disabled')
}

function handleError (err, _req, res, _next) {
  console.error('Caught trailhead error, sending 500')
  console.error(err.stack)
  const message = `Sorry, Trailhead had the following problem processing your request: ${err.message}. Please contact OPO for help.`
  res.status(500).send(message)
}
