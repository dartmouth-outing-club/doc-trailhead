import mongoose from 'mongoose';
import Clubs from '../models/club-model';
import Users from '../models/user-model';
import Trips from '../models/trip-model';
import Vehicles from '../models/vehicle-model';
import VehicleRequests from '../models/vehicle-request-model';
import Assignmnets from '../models/assignment-model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true });
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

const d = new Date();
const today = `${d.getFullYear().toString()}-${d.getMonth().toString() + 1}-${d.getDate().toString() + 1}`;
console.log(today);
