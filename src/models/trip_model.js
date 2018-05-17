import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  title: String,
  leaders: [String], // leader emails
  club: String,
  members: [String], // user emails
  date: String, // change to date time
  cost: String,
  description: String,
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
