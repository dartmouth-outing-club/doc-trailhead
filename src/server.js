import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import apiRouter from './router';
import { mailer, scheduler } from './services';
import * as constants from './constants';
import { tokenForUser } from './controllers/user-controller';
import Trip from './models/trip-model';
import routers from './routers';


const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);

mongoose.connect(mongoURI, { useNewUrlParser: true });
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

mongoose.model('Assignment');

dotenv.config({ silent: true });

// initialize
const app = express();

// enable/disable cross origin resource sharing if necessary
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
});
// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.use('/', apiRouter);
app.use('/trips', routers.trips);

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);
console.log(`listening on: ${port}`);

/**
 * Sends check-out link for trips on their return to leaders.
 */
const sendCheckOutEmail = () => {
  const today = new Date();
  Trip.find({}).populate('leaders').then((trips) => {
    trips.forEach((trip) => {
      if ((trip.startDate > today) && (trip.startDate.getTime() - today.getTime() <= (48 * 3600000)) && (trip.startDate.getTime() - today.getTime() >= (24 * 3600000))) {
        console.log('[Mailer] Sending trip check-out email to leaders');
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip #${trip.number} is happening soon`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.name} is happening in 48 hours!\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nIMPORTANT: on the day of the trip, you must mark all attendees here: ${constants.frontendURL}/trip-check-out/${trip._id}?token=${tokenForUser(trip.leaders[0], 'mobile', trip._id)}\n\nBest,\nDOC Planner` });
      }
    });
  });
};

/**
 * Sends check-in link for trips on their return to leaders.
 */
const sendCheckInEmail = () => {
  const today = new Date();
  Trip.find({}).populate('leaders').then((trips) => {
    trips.forEach((trip) => {
      if ((trip.endDate > today) && (trip.endDate.getTime() - today.getTime() < (48 * 3600000)) && (trip.endDate.getTime() - today.getTime() > (24 * 3600000))) {
        console.log('[Mailer] Sending trip check-in email to leaders');
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip #${trip.number} should be returning soon`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.name} is should return soon. If an EMERGENCY occured, please get emergency help right away, and follow the link below to mark your status so OPO staff is informed.\n\nIMPORTANT: right after you return, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${tokenForUser(trip.leaders[0], 'mobile', trip._id)}\n\nBest,\nDOC Planner` });
      }
    });
  });
};

/**
 * If a trip fails to return within 90 minutes of its designated return time, leaders are emailed with a warning.
 */
const send90MinuteLateEmail = () => {
  const today = new Date();
  Trip.find({}).populate('leaders').then((trips) => {
    trips.forEach((trip) => {
      if ((!trip.returned) && (trip.endDate > today) && (trip.endDate.getTime() - today.getTime() < (48 * 3600000)) && (trip.endDate.getTime() - today.getTime() > (1.5 * 3600000))) {
        console.log('[Mailer] Sending 90 minute fail-to-return email to leaders');
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip #${trip.number} late for return`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.name} is is now 90 minutes late. OPO will be notified in the next 90 minutes if your trip is not back in Hanover. If you are having difficulties getting back, please follow the DOC Emergency Protocols found here:\n\nhttps://docs.google.com/forms/u/1/d/e/1FAIpQLSeo9jIcTGNstZ1uADtovDjJT8kkPtS-YpRwzJC2MZkVkbH0hw/viewform.\n\nIMPORTANT: right after you return, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${tokenForUser(trip.leaders[0], 'mobile', trip._id)}\n\nBest,\nDOC Planner` });
      }
    });
  });
};

/**
 * If a trip has not returned within 3 hours of its designated return time, OPO is alerted.
 */
const send3HourLateEmail = () => {
  console.log('executing warning send');
  const today = new Date();
  Trip.find({}).populate('leaders').then((trips) => {
    trips.forEach((trip) => {
      if ((!trip.returned) && (trip.endDate > today) && (trip.endDate.getTime() - today.getTime() < (3 * 3600000)) && (trip.endDate.getTime() - today.getTime() > (1.5 * 3600000))) {
        console.log('[Mailer] Sending 3 hour fail-to-return notice leaders and OPO staff');
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip #${trip.number} not returned`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, was due back at ${trip.endDate} and has not yet checked back in from Hanover. We have informed OPO staff about your status. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
        mailer.send({ address: constants.OPOEmails, subject: `Trip #${trip.number} not returned`, message: `Hello,\n\nTrip #${trip.number}: ${trip.title}, was due back at ${trip.endDate} and has not yet checked back in from Hanover. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
      }
    });
  });
};

/**
 * Schedules time-based emails.
 */
scheduler.schedule(sendCheckInEmail, 'daily');
scheduler.schedule(sendCheckOutEmail, 'daily');
scheduler.schedule(send90MinuteLateEmail, 'daily');
scheduler.schedule(send3HourLateEmail, 'daily');
