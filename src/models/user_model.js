import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';


const UserSchema = new Schema({
  casID: { type: String },
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  name: { type: String },
  dash_number: String,
  allergies_dietary_restrictions: String,
  medical_conditions: String,
  clothe_size: { type: String, enum: ['XS', 'S', 'M', 'L', 'XL'] },
  shoe_size: Number,
  height: String,
  role: { type: String, enum: ['Leader', 'Trippee', 'OPO'], default: 'Trippee' },
  leader_for: [{ type: Schema.Types.ObjectId, ref: 'Club' }], // the names/ids of clubs you are a leader for
  has_pending_leader_change: { type: Boolean, default: false },
  has_pending_cert_change: { type: Boolean, default: false },
  driver_cert: { type: String, enum: ['MICROBUS', 'VAN', null], default: null },
  trailer_cert: { type: Boolean, default: false },
  requested_clubs: [{ type: Schema.Types.ObjectId, ref: 'Club' }],
  requested_certs: {
    driver_cert: { type: String, enum: ['MICROBUS', 'VAN', null], default: null },
    trailer_cert: { type: Boolean, default: false },
  },
});

UserSchema.set('toJSON', {
  virtuals: true,
});

UserSchema.pre('save', function beforeYourModelSave(next) {
  const user = this;
  if (!user.isModified('password')) {
    return next();
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(user.password, salt);
  user.password = hash;

  return next();
});

UserSchema.methods.comparePassword = function comparePassword(candidatePassword, callback) {
  const user = this;
  const comparisonResult = bcrypt.compareSync(candidatePassword, user.password);
  return callback(null, comparisonResult);
};

const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
