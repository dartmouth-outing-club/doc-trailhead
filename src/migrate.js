import mongoose from 'mongoose';
import Trip from './models/trip-model';
import Global from './models/global-model';
import VehicleRequest from './models/vehicle-request-model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true });
mongoose.Promise = global.Promise; // Set mongoose promises to es6 default


function migrateDB() {
  /**
   * PR#
   * Adds numbering to trips and vehicle requests.
   */
  global = new Global();
  global.tripNumberMax = 0;
  global.vehicleRequestNumberMax = 0;
  global.save().then(() => {
    Trip.find({}).then(async (trips) => {
      let final = 0;
      for (let i = 0; i < trips.length; i += 1) {
        trips[i].number = i + 1;
        final = i + 1;
        // eslint-disable-next-line no-await-in-loop
        await trips[i].save();
      }
      Global.find({}).then((globals) => {
        globals[0].tripNumberMax = final;
        globals[0].save();
      });
    });
    VehicleRequest.find({}).then(async (requests) => {
      let final = 0;
      for (let i = 0; i < requests.length; i += 1) {
        requests[i].number = i + 1;
        final = i + 1;
        // eslint-disable-next-line no-await-in-loop
        await requests[i].save();
      }
      Global.find({}).then((globals) => {
        globals[0].vehicleRequestNumberMax = final;
        globals[0].save();
      });
    });
    console.log('seeded db. Press control+c to exit');
  });
}

migrateDB();
