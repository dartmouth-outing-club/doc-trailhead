import { globals } from '../services/mongo.js'

export async function getAll () {
  return globals.find({})
}
