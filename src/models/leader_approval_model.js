import mongoose, { Schema } from 'mongoose';

const LeaderApprovalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  clubs: [{ type: Schema.Types.ObjectId, ref: 'Club' }],
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
});

LeaderApprovalSchema.set('toJSON', {
  virtuals: true,
});

const LeaderApprovalModel = mongoose.model('LeaderApproval', LeaderApprovalSchema);

export default LeaderApprovalModel;
