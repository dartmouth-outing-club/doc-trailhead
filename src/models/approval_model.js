import mongoose, { Schema } from 'mongoose';

const ApprovalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  clubs: [{ type: Schema.Types.ObjectId, ref: 'Club' }],
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
});

ApprovalSchema.set('toJSON', {
  virtuals: true,
});

const ApprovalModel = mongoose.model('Approval', ApprovalSchema);

export default ApprovalModel;
