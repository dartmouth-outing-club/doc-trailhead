import { globals } from '../services/mongo.js'

/**
 * Increment the max vehicle request number and return the new one.
 *
 * This is one of those things that really shouldn't exist, but we
 * need to replicate it for the time being.
 */
export async function incrementVehicleRequestNumber () {
  const global = await globals.findOneAndUpdate(
    {}, // the globals collection only has a single document
    { $inc: { vehicleRequestNumberMax: 1 } },
    { returnDocument: 'after' }
  )
  return global.vehicleRequestNumberMax
}

/**
 * Increment the max vehicle request number and return the new one.
 *
 * This is one of those things that really shouldn't exist, but we
 * need to replicate it for the time being.
 */
export async function incrementTripNumber () {
  const global = await globals.findOneAndUpdate(
    {}, // the globals collection only has a single document
    { $inc: { tripNumberMax: 1 } },
    { returnDocument: 'after' }
  )
  return global.tripNumberMax
}
