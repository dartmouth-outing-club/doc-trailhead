import mongoose, { Schema } from 'mongoose';
import Vehicle from './vehicle_model';
import VehicleRequest from './vehicle_request_model';

const AssignmentSchema = new Schema({
  request: { type: Schema.Types.ObjectId, ref: 'VehicleRequest' },
  requester: { type: Schema.Types.ObjectId, ref: 'User' },
  responseIndex: Number,
  assigned_pickupDate: Date,
  assigned_pickupTime: String,
  assigned_returnDate: Date,
  assigned_returnTime: String,
  assigned_key: String,
  assigned_vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle' },
  pickedUp: { type: Boolean, default: false },
  returned: { type: Boolean, default: false },
});

AssignmentSchema.set('toJSON', {
  virtuals: true,
});

// hooks to ensure referencing assignments are deleted. 
AssignmentSchema.pre('deleteOne', async function () {
  await deleteAssignmentFromVehicle(this);
  await deleteAssignmentFromVehicleRequest(this);
});

AssignmentSchema.pre('deleteMany', async function () {
  await deleteAssignmentFromVehicle(this);
  await deleteAssignmentFromVehicleRequest(this);
});

const deleteAssignmentFromVehicle = (thisObj) => {
  return new Promise(async (resolve, reject) => {
    await Vehicle.updateOne({ _id: thisObj.assigned_vehicle }, { $pull: { bookings: thisObj._id } });
    resolve();
  });
}

const deleteAssignmentFromVehicleRequest = (thisObj) => {
  return new Promise(async (resolve, reject) => {
    await VehicleRequest.updateOne({ _id: thisObj.request }, { $pull: { assignments: thisObj._id } });
    resolve();
  });
}


const AssignmentModel = mongoose.model('Assignment', AssignmentSchema);

export default AssignmentModel;
