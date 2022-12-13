import * as db from '../services/sqlite.js'

export function handleGetVehicles (_req, res) {
  const activeVehicles = db.getActiveVehicles()
  return res.json(activeVehicles)
}

export async function handlePostVehicles (req, res) {
  const { name, type } = req.body
  const _id = db.insertVehicle(name, type)

  res.json({ _id, name, type })
}

export async function updateVehicle (req, res) {
  const { name, type } = req.body
  const _id = req.params.id
  db.updateVehicle(_id, name, type)
  res.json({ _id, name, type })
}

export async function handleDeleteVehicle (req, res) {
  const changes = db.makeVehicleInactive(req.params.id)
  if (changes !== 1) {
    console.error(`Requested to delete ${req.params._id}, but got unexpected response: ${changes}`)
  }

  // It doesn't matter whether there was something to delete or not, send 204 NO CONTENT
  res.status(204).send()
}
