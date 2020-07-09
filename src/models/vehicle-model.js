import mongoose, { Schema } from 'mongoose';


const VehicleSchema = new Schema({
  name: { type: String, unique: true },
  type: { type: String, enum: ['Van', 'Microbus', 'Truck', 'Enterprise'] },
  bookings: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
  active: { type: Boolean, default: true },
});

VehicleSchema.set('toJSON', {
  virtuals: true,
});


const VehicleModel = mongoose.model('Vehicle', VehicleSchema);

export default VehicleModel;
