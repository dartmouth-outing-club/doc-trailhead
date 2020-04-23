import mongoose, { Schema } from 'mongoose';


const ClubSchema = new Schema({
  name: { type: String, unique: true },
});

ClubSchema.set('toJSON', {
  virtuals: true,
});


const ClubModel = mongoose.model('Club', ClubSchema);

export default ClubModel;
