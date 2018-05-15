import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  leader: String,
  club: String,
  members: [String],
  date: String,
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
