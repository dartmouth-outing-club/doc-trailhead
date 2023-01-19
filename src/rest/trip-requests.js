import * as sqlite from '../services/sqlite.js'
import * as tripRequests from '../views/trip-requests.js'

export function putVehicleRequest (req, res) {
  const input = { ...req.body }
  const tripId = req.params.tripId

  sqlite.run('DELETE FROM vehiclerequests WHERE trip = ?', tripId)
  const info = sqlite.run(`
      INSERT INTO vehiclerequests (requester, request_details, trip)
      VALUES (?, ?, ?)
      `, req.user, input.notes, tripId)
  const vehiclerequestId = info.lastInsertRowid

  // The client will append a number to end of each field
  // Loops through the fields until you run out of valid numbers
  let index = 1
  const vehicles = []
  while (input[`type-${index}`]) {
    const vehicle = {
      vehiclerequest: vehiclerequestId,
      type: input[`type-${index}`],
      pickup_time: (new Date(input[`pickup-${index}`])).getTime(),
      return_time: (new Date(input[`return-${index}`])).getTime(),
      trailer_needed: input[`trailer_needed-${index}`] ? 1 : 0,
      pass_needed: input[`pass_needed-${index}`] ? 1 : 0
    }
    vehicles.push(vehicle)
    index++
  }

  sqlite.runMany(`
    INSERT INTO requested_vehicles
      (vehiclerequest, type, pickup_time, return_time, trailer_needed, pass_needed)
    VALUES (@vehiclerequest, @type, @pickup_time, @return_time, @trailer_needed, @pass_needed)
  `, vehicles)

  tripRequests.renderVehicleRequestView(tripId, res)
}
