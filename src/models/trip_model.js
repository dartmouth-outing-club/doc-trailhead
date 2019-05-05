import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  title: String,
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }], // leaders
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }], // users
  pending: [{ type: Schema.Types.ObjectId, ref: 'User' }], // pending members
  startDate: Date,
  endDate: Date,
  startTime: String,
  endTime: String,
  location: String,
  mileage: Number,
  cost: Number,
  description: String,
  experienceNeeded: Boolean,
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
