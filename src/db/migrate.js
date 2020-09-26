/* eslint-disable no-unused-vars */
import mongoose from 'mongoose';
import Trip from '../models/trip-model';
import Global from '../models/global-model';
import VehicleRequest from '../models/vehicle-request-model';
import UserModel from '../models/user-model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true }).then((connection) => {
  return console.log(`MongoDB connection established at ${connection.connections[0].host}:${connection.connections[0].port}`);
});
mongoose.Promise = global.Promise; // Set mongoose promises to es6 default


function migrateDB() {
  Trip.find({}).then((trips) => {
    trips.forEach((trip) => {
      trip.private = false;
      trip.save();
    });
  });
}

migrateDB();
