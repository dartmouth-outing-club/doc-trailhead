import fs from 'node:fs'
import express from 'express'
import cron from 'node-cron'
import morgan from 'morgan'
import nunjucks from 'nunjucks'
import bodyParser from 'body-parser'

import * as sessions from './services/sessions.js'
import * as emails from './emails.js'
import * as mailer from './services/mailer.js'

import apiRouter from './router.js'
import TrailheadDatabaseConnection from './services/sqlite.js'

process.env.TZ = 'America/New_York'

const PACKAGE_JSON = JSON.parse(fs.readFileSync('./package.json'))
const ONE_YEAR_IN_MS = 3.156e10
const HTMX_VERSION = getPackageVersion('htmx.org')
const FULLCALENDAR_VERSION = getPackageVersion('fullcalendar-scheduler')

const trailheadDb = new TrailheadDatabaseConnection('trailhead.db')

const app = express()
app.use(morgan('dev'))
app.yearCache = (route, path) => app.use(route, express.static(path, { maxAge: ONE_YEAR_IN_MS }))

app.use('/static', express.static('static'))
app.yearCache(`/htmx-${HTMX_VERSION}`, 'node_modules/htmx.org/dist')
app.yearCache(`/fullcalendar-${FULLCALENDAR_VERSION}`, 'node_modules/fullcalendar-scheduler')
app.use(bodyParser.urlencoded({ extended: true }))

nunjucks
  .configure('./src/templates', {
    autoescape: false, // The SQLite rest methods already escape results
    express: app
  })
  .addGlobal('NODE_ENV', process.env.NODE_ENV)
  .addGlobal('HTMX_VERSION', HTMX_VERSION)
  .addGlobal('FULLCALENDAR_VERSION', FULLCALENDAR_VERSION)
app.set('views', 'templates/views')

app.use((req, _res, next) => { req.db = trailheadDb; next() })
app.use('/', apiRouter)
app.use(handleError)

const isTest = process.env.NODE_ENV === 'TESTS'

sessions.start(`sessions${isTest ? '' : ''}.db`)
process.on('exit', () => {
  trailheadDb.stop()
  sessions.stop()
})
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))

// Start the server
// =============================================================================
const port = process.env.PORT || 8080
app.listen(port)
console.log(`Server running at http://localhost:${port}`)
console.error(`Starting up at ${new Date()}`)

// Create and schedule time-based emails
// =============================================================================
const checkOutEmails = mailer.createRecurringEmailSender('CHECK_OUT',
  trailheadDb, emails.getEmailsForTripsPendingCheckOut)

const checkInEmails = mailer.createRecurringEmailSender('CHECK_IN',
  trailheadDb, emails.getEmailsForTripsPendingCheckIn)

const late90MinEmails = mailer.createRecurringEmailSender('LATE_90',
  trailheadDb, emails.getEmailsForTrips90MinutesLate)

const late3HourEmails = mailer.createRecurringEmailSender('LATE_180',
  trailheadDb, emails.getEmailsForTrips3HoursLate)

// These wacky times are a stopgap to mitigate the connection limit throttling
// I'll batch these properly (with precise queries) soon
console.log('Starting scheduler')
cron.schedule('10 * * * *', checkOutEmails)
cron.schedule('20 * * * *', checkInEmails)
cron.schedule('5,15,25,35,45,55 * * * *', late90MinEmails)
cron.schedule('17,37,57 * * * *', late3HourEmails)

function handleError (err, req, res, _next) {
  switch (err.name) {
    case 'BadRequestError':
      return res.status(400).send(err.message)
    default:
      console.error(`Unexpected error for ${req.method} ${req.url}, sending 500`)
      console.error(err.stack)
      console.error(req.body)
  }

  return res.status(500).send('Sorry, Trailhead experienced an error. Please reach to OPO.')
}

// For the packages we serve statically, specify the version exactly
// This function wouldn't work if you did something like "<5.0"
// We append the package version to the URL so that the caches bust on upgrade
function getPackageVersion (packageName) {
  return PACKAGE_JSON.dependencies[packageName].replace(/[^0-9.]/, '')
}
