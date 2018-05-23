import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  title: String,
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }], // leaders
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }], // users
  startDate: Date,
  endDate: Date,
  cost: String,
  description: String,
  limit: Number,
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
