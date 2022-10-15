import mongoose from 'mongoose'
const { Schema } = mongoose

const ClubSchema = new Schema({
  name: { type: String, unique: true },
  active: { type: Boolean, default: true }
})

ClubSchema.set('toJSON', {
  virtuals: true
})

const ClubModel = mongoose.model('Club', ClubSchema)

export default ClubModel
