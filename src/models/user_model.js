import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';


const UserSchema = new Schema({
  email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  name: { type: String },
  role: { type: String, enum: ['Leader', 'Trippee', 'OPO', 'Pending_Leader'], default: 'Trippee' },
  leader_for: [{ type: Schema.Types.ObjectId, ref: 'Club' }], // the names/ids of clubs you are a leader for
  dash_number: String,
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
