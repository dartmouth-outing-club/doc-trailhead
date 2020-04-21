import mongoose from 'mongoose';
import Trips from './models/trip-model';
import VehicleRequests from './models/vehicle-request-model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true });
mongoose.Promise = global.Promise; // Set mongoose promises to es6 default


function migrateDB() {
  /**
   * PR#
   * Adds numbering to trips and vehicle requests.
   */
  Trips.find({}).then(async (trips) => {
    for (let i = 0; i < trips.length; i += 1) {
      trips[i].number = i + 1;
      // eslint-disable-next-line no-await-in-loop
      await trips[i].save();
    }
  });
  VehicleRequests.find({}).then(async (requests) => {
    for (let i = 0; i < requests.length; i += 1) {
      requests[i].number = i + 1;
      // eslint-disable-next-line no-await-in-loop
      await requests[i].save();
    }
  });
}

migrateDB();
