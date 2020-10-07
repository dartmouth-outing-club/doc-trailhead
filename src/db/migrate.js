/* eslint-disable no-unused-vars */
import mongoose from 'mongoose';
import models from '../models';

const mongoURI = process.env.MONGODB_URI;
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true }).then((connection) => {
  return console.log(`MongoDB connection established at ${connection.connections[0].host}:${connection.connections[0].port}`);
});
mongoose.Promise = global.Promise; // Set mongoose promises to es6 default

let documentsModified = 0;
let documentsFailed = 0;

async function migrateDB() {
  await Promise.all(
    (await models.trip.find({})).map(async (trip) => {
      trip.past = false;
      try {
        await trip.save();
        documentsModified += 1;
      } catch (error) {
        console.error(error);
        documentsFailed += 1;
      }
    }),
  );
}

migrateDB().then(() => {
  console.log('Documents modified: ', documentsModified);
  console.log('Documents failed: ', documentsFailed);
  process.exit();
});
