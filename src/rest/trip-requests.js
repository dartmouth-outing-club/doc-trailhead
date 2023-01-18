import * as sqlite from '../services/sqlite.js'

export function putVehicleRequest (req, res) {
  console.log(req.body)

  const tripId = req.params.tripId
  const active_vehicles = sqlite.getActiveVehicles()
  res.render('requests/vehicle-request.njs', { trip_id: tripId, active_vehicles })
}
