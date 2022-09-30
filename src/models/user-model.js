import mongoose from 'mongoose';
const { Schema } = mongoose;
import bcrypt from 'bcryptjs';


const UserSchema = new Schema({
  casID: String,
  email: { type: String, lowercase: true },
  password: { type: String, select: false }, // not defined if the user is from CAS
  name: String,
  photo_url: String,
  pronoun: String,
  dash_number: String,
  allergies_dietary_restrictions: String,
  medical_conditions: String,
  clothe_size: { type: String, enum: ['Men-XS', 'Men-S', 'Men-M', 'Men-L', 'Men-XL', 'Women-XS', 'Women-S', 'Women-M', 'Women-L', 'Women-XL'] },
  shoe_size: String,
  height: String,
  role: { type: String, enum: ['Leader', 'Trippee', 'OPO'], default: 'Trippee' },
  leader_for: { type: [{ type: Schema.Types.ObjectId, ref: 'Club' }], default: [] }, // the names/ids of clubs you are a leader for
  has_pending_leader_change: { type: Boolean, default: false },
  has_pending_cert_change: { type: Boolean, default: false },
  driver_cert: { type: String, enum: ['MICROBUS', 'VAN', null], default: null },
  trailer_cert: { type: Boolean, default: false },
  requested_clubs: { type: [{ type: Schema.Types.ObjectId, ref: 'Club' }], default: [] },
  requested_certs: {
    driver_cert: { type: String, enum: ['MICROBUS', 'VAN', null], default: null },
    trailer_cert: { type: Boolean, default: false },
  },
  completedProfile: { type: Boolean, default: false },
});

UserSchema.set('toJSON', {
  virtuals: true,
});

UserSchema.pre('save', function beforeYourModelSave(next) {
  const user = this;

  // checks whether the user has a completed profile
  if (user.email && user.name && user.pronoun && user.dash_number && user.allergies_dietary_restrictions && user.medical_conditions && user.clothe_size && user.shoe_size && user.height) {
    user.completedProfile = true;
  } else {
    user.completedProfile = false;
  }

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
