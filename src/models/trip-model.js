import mongoose, { Schema } from 'mongoose';

const TripSchema = new Schema({
  number: { type: Number, unique: true },
  title: { type: String, default: 'Untitled trip' },
  private: { type: Boolean, default: false },
  left: { type: Boolean, default: false },
  returned: { type: Boolean, default: false },
  markedLate: { type: Boolean, default: false },
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  owner: { type: Schema.Types.ObjectId, ref: 'User' },
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    attended: { type: Boolean, default: false },
    requestedGear: [{ gearId: String, name: String }],
  }],
  pending: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    requestedGear: [{ gearId: String, name: String }],
  }],
  startDateAndTime: { type: Date },
  endDateAndTime: { type: Date },
  startDate: { type: Date },
  endDate: { type: Date },
  startTime: { type: String },
  endTime: { type: String },
  location: { type: String },
  pickup: { type: String },
  dropoff: { type: String },
  cost: { type: Number, default: 0 },
  description: { type: String },
  experienceNeeded: { type: Boolean, default: false },
  coLeaderCanEditTrip: { type: Boolean, default: false },
  OPOGearRequests: [
    {
      name: { type: String },
      quantity: { type: Number },
    },
  ],
  trippeeGear: [{ name: String, sizeType: { type: String, enum: ['N/A', 'Clothe', 'Shoe', 'Height'], default: 'N/A' }, quantity: Number }],
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
  sentEmails: { type: Array, default: [] },
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
