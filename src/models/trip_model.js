import mongoose, { Schema } from 'mongoose';


const TripSchema = new Schema({
  title: String,
  leaders: [{ type: Schema.Types.ObjectId, ref: 'User' }], // leaders
  club: { type: Schema.Types.ObjectId, ref: 'Club' },
  members: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // users
    gear: [{ gearId: String, gear: String }],
  }], 
  pending: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' }, // pending members
    gear: [{ gearId: String, gear: String }],
  }],
  startDate: Date,
  endDate: Date,
  startTime: String,
  endTime: String,
  location: String,
  pickup: String,
  dropoff: String,
  mileage: Number,
  cost: Number,
  description: String,
  experienceNeeded: Boolean,
  co_leader_access: { type: Boolean, default: false },
  OPOGearRequests: [String],
  trippeeGear: [{ gear: String, size_type: {type: String, enum: ['N/A', 'Clothe', 'Shoe', 'Height'], default: 'N/A' }, quantity: Number }],
  gearStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  trippeeGearStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  pcardRequest: [{ subclub: { type: Schema.Types.ObjectId, ref: 'Club' }, 
                  participants: Number, 
                  totalCost: Number,
                  reason: [{info: [{  
                              expenseDetails: String, 
                              unitCost: Number, 
                              totalCost: Number,
                                  }]
                          }],   
                }],
  pcardStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
  vehicleStatus: { type: String, enum: ['pending', 'approved', 'denied', 'N/A'], default: 'N/A' },
});

TripSchema.set('toJSON', {
  virtuals: true,
});


const TripModel = mongoose.model('Trip', TripSchema);

export default TripModel;
