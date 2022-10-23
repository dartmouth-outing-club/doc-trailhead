import { subtract } from 'date-arithmetic'
import { vehicles } from '../services/mongo.js'
import Vehicle from '../models/vehicle-model.js'

export async function createVehicle (req, res) {
  const vehicle = { name: req.body.name, body: req.body.type }
  const { insertedId } = await vehicles.insertOne(vehicle)
  res.json({ ...vehicle, _id: insertedId })
}

export async function getVehicles (req, res) {
  const bookingsFilters = {}
  if (req.query.showOldBookings === 'false') {
    bookingsFilters.assigned_pickupDateAndTime = { $gte: subtract(new Date(), 30, 'day') }
  }
  Vehicle.find().populate('bookings').populate({
    path: 'bookings',
    match: bookingsFilters,
    populate: {
      path: 'request',
      model: 'VehicleRequest'
    }
  }).populate({
    path: 'bookings',
    match: bookingsFilters,
    populate: {
      path: 'requester',
      model: 'User'
    }
  })
    .populate({
      path: 'bookings',
      match: bookingsFilters,
      populate: {
        path: 'request',
        populate: {
          path: 'associatedTrip',
          model: 'Trip',
          populate: {
            path: 'leaders'
          }
        }
      }
    })
    .exec()
    .then((vehicles) => {
      res.json(vehicles.filter((vehicle) => { return vehicle.active }))
    })
    .catch((error) => {
      res.status(500).send(error)
      console.log(error)
    })
}

export async function updateVehicle (req, res) {
  const vehicle = { name: req.body.name, body: req.body.type }
  await vehicles.updateOne({ _id: req.params.id }, { $set: vehicle })
  res.json(vehicle)
}

export async function deleteVehicle (req, res) {
  const mongoResponse = await vehicles.updateOne(
    { _id: req.params.id },
    { $set: { active: false } }
  )

  if (mongoResponse.modifiedCount !== 1) {
    console.error(`Requested to delete ${req.params._id}, but got unexpected response`)
    console.log(mongoResponse)
  }

  // It doesn't matter whether there was something to delete or not, send 204 NO CONTENT
  res.status(204).send()
}
