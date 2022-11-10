import { vehicles } from '../services/mongo.js'

export async function getVehicle (id) {
  return vehicles.findOne({ _id: id })
}

export async function getActiveVehicles (_req, res) {
  const allVehicles = await vehicles.find({ active: true }).toArray()
  return res.json(allVehicles)
}

export async function getVehicleMap () {
  const allVehicles = await vehicles.find({}).toArray()
  const vehiclesMap = allVehicles.reduce((map, vehicle) => {
    map[vehicle._id] = vehicle
    return map
  }, {})
  return vehiclesMap
}

export async function createVehicle (req, res) {
  const vehicle = { name: req.body.name, body: req.body.type }
  const { insertedId } = await vehicles.insertOne(vehicle)
  res.json({ ...vehicle, _id: insertedId })
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
