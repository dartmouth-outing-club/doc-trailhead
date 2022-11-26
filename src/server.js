/* eslint-disable no-unused-vars */
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import cron from 'node-cron'
import morgan from 'morgan'
import mongoose from 'mongoose'
import dateMath from 'date-arithmetic'

import * as constants from './constants.js'
import apiRouter from './router.js'
import * as mailer from './services/mailer.js'
import TripRouter from './routers/trip-router.js'
import * as trips from './controllers/trip-controller.js'

// We have to import these at least once so they "register"
// These can be removed once all the models get removed.
import User from './models/user-model.js'
import Club from './models/club-model.js'
import Global from './models/global-model.js'
import Vehicle from './models/vehicle-model.js'
import VehicleRequest from './models/vehicle-request-model.js'
import Assignment from './models/assignment-model.js'
import Trip from './models/trip-model.js'

process.env.TZ = 'America/New_York'

const mongoURI = process.env.MONGODB_URI

mongoose.connect(mongoURI, { useNewUrlParser: true })
  .then((connection) => {
    return console.log(`MongoDB connection established at ${connection.connections[0].host}:${connection.connections[0].port}`)
  }).catch((error) => {
    console.log(`Error connecting to MongoDB: ${error.message}`)
    mongoose.connect('mongodb://localhost/trailhead', { useNewUrlParser: true }).then((connection) => {
      return console.log(`MongoDB connection established at ${connection.connections[0].host}:${connection.connections[0].port}`)
    })
  })

// set mongoose promises to es6 default
mongoose.Promise = global.Promise

const app = express()

app.use(cors())

// enable/disable http request logging
app.use(morgan('dev'))

// enable only if you want static assets from folder static
app.use(express.static('static'))

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

app.use('/', apiRouter, handleError)
app.use('/trips', TripRouter, handleError)

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090
app.listen(port)
console.log(`Server running at ${process.env.NODE_ENV !== 'development' ? constants.backendURL : 'localhost'}:${port}`)
console.error(`Starting up at ${new Date()}`)

const checkOutEmails = mailer.createRecurringEmailSender('trip check-out',
  trips.getTripsPendingCheckOutEmail, mailer.sendCheckOutEmail, trips.markCheckOutEmail)

const checkInEmails = mailer.createRecurringEmailSender('trip check-in',
  trips.getTripsPendingCheckInEmail, mailer.sendCheckInEmail, trips.markCheckInEmail)

const late90MinEmails = mailer.createRecurringEmailSender('trip late 90 minutes',
  trips.getTripsPending90MinEmail, mailer.send90MinuteLateEmail, trips.mark90MinEmail)

const late3HourEmails = mailer.createRecurringEmailSender('trip late 3 hours',
  trips.getTripsPending3HourEmail, mailer.send3HourLateEmail, trips.markTripLate)

const markTripsAsPast = () => {
  const now = new Date()
  const yesterday = dateMath.subtract(now, 1, 'day')
  Trip.find({ past: false }).sort({ startDateAndTime: 'ascending' }).then((trips) => {
    trips.forEach((trip) => {
      if (trip.startDateAndTime < yesterday) {
        trip.past = true
        trip.save()
      }
    })
  })
}

/**
 * Schedules time-based emails.
 */
if (process.env.NODE_ENV !== 'development' && process.env.SCHEDULER_STATUS !== 'disabled') {
  // These wacky times are a stopgap to mitigate the connection limit throttling
  // I'll batch these properly (with precise queries) soon
  console.log('Starting scheduler')
  cron.schedule('0 1 * * *', markTripsAsPast)
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
