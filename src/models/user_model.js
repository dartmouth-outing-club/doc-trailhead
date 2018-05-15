import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcryptjs';


const UserSchema = new Schema({
  email: { type: String, unique: true, lowercase: true },
  password: { type: String },
  name: { type: String },
  is_leader: Boolean, // are you a leader for any club (opens up trip making option)
  leader_for: [String], // the names/ids of clubs you are a leader for
});

UserSchema.set('toJSON', {
  virtuals: true,
});

UserSchema.pre('save', function beforeyYourModelSave(next) {
  // this is a reference to our model
  // the function runs in some other context so DO NOT bind it
  const user = this;
  if (!user.isModified('password')) return next();
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(user.password, salt);
  user.password = hash;

  // when done run the next callback with no arguments
  // call next with an error if you encounter one
  return next();
});

UserSchema.methods.comparePassword = function comparePassword(candidatePassword, callback) {
  const user = this;
  const comparisonResult = bcrypt.compareSync(candidatePassword, user.password);
  return callback(null, comparisonResult);
  // or callback(error) in the error case
};


const UserModel = mongoose.model('User', UserSchema);

export default UserModel;
