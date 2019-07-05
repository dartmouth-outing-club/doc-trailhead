import mongoose, { Schema } from 'mongoose';

const CertApprovalSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  driver_cert: { type: String, enum: ['MICROBUS', 'VAN', 'MINIVAN', null], default: null },
  trailer_cert: { type: Boolean, default: false },
  status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
});

CertApprovalSchema.set('toJSON', {
  virtuals: true,
});

const CertApprovalModel = mongoose.model('CertApproval', CertApprovalSchema);

export default CertApprovalModel;
