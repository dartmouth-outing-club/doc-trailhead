import mongoose, { Schema } from 'mongoose';


const AssignmentSchema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'VehicleRequest' },
  requester: { type: Schema.Types.ObjectId, ref: 'User' },
  responseIndex: Number,
  assigned_pickUpDate: Date,
  assigned_pickupTime: String,
  assigned_returnDate: Date,
  assigned_returnTime: String,
  assigned_key: String,
  assigned_vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
});

AssignmentSchema.set('toJSON', {
  virtuals: true,
});


const AssignmentModel = mongoose.model('Assignment', AssignmentSchema);

export default AssignmentModel;
