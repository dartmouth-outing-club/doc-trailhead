import mongoose, { Schema } from 'mongoose';

const VehicleRequestSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User' },
  requestDetails: String,
  mileage: Number,
  noOfPeople: Number,
  associatedTrip: { type: Schema.Types.ObjectId, ref: 'Trip' },
  requestType: { type: String, enum: ['TRIP', 'SOLO'] },
  requestedVehicles: [
    {
      vehicleType: { type: String, enum: ['Van', 'Microbus', 'Truck'] },
      vehicleDetails: String,
      pickupDate: Date,
      pickupTime: String,
      returnDate: Date,
      returnTime: String,
      trailerNeeded: Boolean,
      passNeeded: Boolean,
    }
  ],
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }]
});

VehicleRequestSchema.set('toJSON', {
  virtuals: true,
});


const VehicleRequestModel = mongoose.model('VehicleRequest', VehicleRequestSchema);

export default VehicleRequestModel;
