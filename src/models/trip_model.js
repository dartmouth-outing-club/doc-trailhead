import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  title: String,
  leaders: [String], // leader emails
  club: String,
  members: [String], // user emails
  date: String,
  cost: Number,
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
