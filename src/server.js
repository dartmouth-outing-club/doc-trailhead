import express from 'express'
import cron from 'node-cron'
import morgan from 'morgan'
import nunjucks from 'nunjucks'
import bodyParser from 'body-parser'

import package_json from '../package.json' assert { type: 'json' }
import * as db from './services/sqlite.js'
import * as sessions from './services/sessions.js'
import * as mailer from './services/mailer.js'
import apiRouter from './router.js'

process.env.TZ = 'America/New_York'

const ONE_YEAR_IN_MS = 3.156e10
const HTMX_VERSION = getPackageVersion('htmx.org')
const FULLCALENDAR_VERSION = getPackageVersion('fullcalendar-scheduler')

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

app.use('/', apiRouter)
app.use(handleError)

// Open database connections
const isTest = process.env.NODE_ENV === 'TESTS'
db.start(`trailhead${isTest ? '-test' : ''}.db`)
sessions.start(`sessions${isTest ? '-test' : ''}.db`)
process.on('exit', () => {
  db.stop()
  sessions.stop()
})
process.on('SIGHUP', () => process.exit(128 + 1))
process.on('SIGINT', () => process.exit(128 + 2))
process.on('SIGTERM', () => process.exit(128 + 15))

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 8080
app.listen(port)
console.log(`Server running at http://localhost:${port}`)
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

function getPackageVersion (packageName) {
  // For the packages we serve statically, just specify the version exactly
  // That way the cache will always get busted when the version upgrades
  return package_json.dependencies[packageName].replace(/[^0-9\.]/, '')
}
