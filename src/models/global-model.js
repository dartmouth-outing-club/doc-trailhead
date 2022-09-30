import mongoose from 'mongoose';
const { Schema } = mongoose;


const GlobalSchema = new Schema({
  tripNumberMax: Number,
  vehicleRequestNumberMax: Number,
});

GlobalSchema.set('toJSON', {
  virtuals: true,
});


const GlobalModel = mongoose.model('Global', GlobalSchema);

export default GlobalModel;
