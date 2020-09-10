import mongoose, { Schema } from 'mongoose';

const TripSchema = new Schema({
  number: { type: Number, unique: true },
  title: { type: String, default: 'Untitled trip' },
  returned: { type: Boolean, default: false },
  markedLate: { type: Boolean, default: false },
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // users
    attended: { type: Boolean, default: false }, // whether or not the user was present for the trip or bailed out
    requestedGear: [{ gearId: String, name: String }],
  }],
  pending: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // pending members
    gear: [{ gearId: String, name: String }],
  }],
  startDateAndTime: Date,
  endDateAndTime: Date,
  startDate: Date,
  endDate: Date,
  startTime: String,
  endTime: String,
  location: String,
  pickup: String,
  dropoff: String,
  cost: Number,
  description: String,
  experienceNeeded: Boolean,
  co_leader_access: { type: Boolean, default: false },
  OPOGearRequests: [[String, Number]],
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
  pcardAssigned: { type: String, default: 'None' },
  vehicleStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  vehicleRequest: { type: Schema.Types.ObjectId, ref: 'VehicleRequest' },
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
