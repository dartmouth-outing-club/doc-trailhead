import * as sqlite from '../services/sqlite.js'
// import * as utils from '../utils.js'

export function getRequestsView (req, res) {
  const tripId = req.params.tripId
  const active_vehicles = sqlite.getActiveVehicles()
  res.render('views/requests.njs', { trip_id: tripId, active_vehicles })
}
