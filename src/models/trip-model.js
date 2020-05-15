import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  number: { type: Number, unique: true },
  title: String,
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }], // leaders
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // users
    gear: [{ gearId: String, name: String }],
  }],
  pending: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // pending members
    gear: [{ gearId: String, name: String }],
  }],
  startDate: Date,
  endDate: Date,
  startTime: String,
  endTime: String,
  location: String,
  pickup: String,
  dropoff: String,
  mileage: Number,
  cost: Number,
  description: String,
  experienceNeeded: Boolean,
  co_leader_access: { type: Boolean, default: false },
  OPOGearRequests: [String],
  trippeeGear: [{ name: String, size_type: { type: String, enum: ['N/A', 'Clothe', 'Shoe', 'Height'], default: 'N/A' }, quantity: Number }],
  gearStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  trippeeGearStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  pcard: [
    {
      numPeople: Number,
      snacks: Number,
      breakfast: Number,
      lunch: Number,
      dinner: Number,
      otherCosts: [
        {
          title: String,
          cost: Number,
        },
      ],
    },
  ], // will actually only have one entry
  pcardStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  pcardAssigned: String,
  vehicleStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  vehicleRequest: { type: Schema.Types.ObjectId, ref: 'VehicleRequest' },
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
