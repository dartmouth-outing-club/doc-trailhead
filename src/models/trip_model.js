import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  title: String,
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }], // leaders
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // users
    gear: [{ gearId: String, gear: String }],
  }], 
  pending: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // pending members
    gear: [{ gearId: String, gear: String }],
  }],
  startDate: Date,
  endDate: Date,
  startTime: String,
  endTime: String,
  location: String,
  mileage: Number,
  cost: Number,
  description: String,
  experienceNeeded: Boolean,
  OPOGearRequests: [String],
  trippeeGear: [{ gear: String, quantity: Number }],
  gearStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  trippeeGearStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
