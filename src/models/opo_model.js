import mongoose, { Schema } from 'mongoose';

const OpoSchema = new Schema({
  pending_approval: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'approved', 'declined'], default: 'pending' },
  }],
})

OpoSchema.set('toJSON', {
  virtuals: true,
});

const OpoModel = mongoose.model('Opo', OpoSchema);

export default OpoModel;