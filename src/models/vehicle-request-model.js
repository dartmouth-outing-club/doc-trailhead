import mongoose, { Schema } from 'mongoose';

const VehicleRequestSchema = new Schema({
  number: { type: Number, unique: true },
  requester: { type: Schema.Types.ObjectId, ref: 'User' },
  requestDetails: String,
  mileage: Number,
  noOfPeople: Number,
  associatedTrip: { type: Schema.Types.ObjectId, ref: 'Trip' },
  requestType: { type: String, enum: ['TRIP', 'SOLO'] },
  requestedVehicles: [
    {
      vehicleType: { type: String, enum: ['Van', 'Microbus', 'Truck', 'PersonalVehicle'] },
      vehicleDetails: String,
      pickupDate: Date,
      pickupTime: String,
      pickupDateAndTime: Date,
      returnDate: Date,
      returnDateAndTime: Date,
      returnTime: String,
      trailerNeeded: Boolean,
      passNeeded: Boolean,
      recurringVehicle: Boolean,
    },
  ],
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
});

VehicleRequestSchema.set('toJSON', {
  virtuals: true,
});


const VehicleRequestModel = mongoose.model('VehicleRequest', VehicleRequestSchema);

export default VehicleRequestModel;
