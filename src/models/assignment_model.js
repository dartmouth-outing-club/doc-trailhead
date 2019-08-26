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
  pickedUp: { type: Boolean, default: false },
  returned: { type: Boolean, default: false },
});

AssignmentSchema.set('toJSON', {
  virtuals: true,
});

AssignmentSchema.pre('deleteOne', async function () {
  print('here');
  await deleteAssignmentFromVehicle();
  await deleteAssignmentFromVehicleRequest();
  // next();
});

AssignmentSchema.pre('deleteMany', async function () {
  await deleteAssignmentFromVehicle();
  await deleteAssignmentFromVehicleRequest();
  // next();
});

const deleteAssignmentFromVehicle = () => {
  return new Promise(async (resolve, reject) => {
    await this.model('Vehicle').update({}, { $pull: { bookings: this._id } });
    resolve();
  });
}

const deleteAssignmentFromVehicleRequest = () => {
  return new Promise(async (resolve, reject) => {
    await this.model('VehicleRequest').update({}, { $pull: { assignments: this._id } });
    resolve();
  });
}


const AssignmentModel = mongoose.model('Assignment', AssignmentSchema);

export default AssignmentModel;
