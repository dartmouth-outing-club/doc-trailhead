import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'

export function renderVehicleRequestView (tripId, res) {
  const data = getVehicleRequestData(tripId)
  res.render('requests/vehicle-request.njs', { ...data })
}

export function renderIndividualGearView (tripId, res) {
  const data = getIndividualGearData(tripId)
  res.render('requests/individual-gear.njs', { ...data })
}

export function renderGroupGearView (tripId, res) {
  const data = getGroupGearData(tripId)
  res.render('requests/group-gear.njs', { ...data })
}

export function getRequestsView (req, res) {
  const tripId = req.params.tripId
  const vehicleData = getVehicleRequestData(tripId)
  const individualGearData = getIndividualGearData(tripId)
  const groupGearData = getGroupGearData(tripId)
  res.render('views/trip-requests.njs', { ...vehicleData, ...individualGearData, ...groupGearData })
}

function getVehicleRequestData (tripId) {
  const requested_vehicles = sqlite.all(`
    SELECT type, pickup_time, return_time, trailer_needed, pass_needed, request_details
    FROM requested_vehicles
    LEFT JOIN vehiclerequests ON vehiclerequests.id = requested_vehicles.vehiclerequest
    WHERE vehiclerequests.trip = ?
  `, tripId)
    .map(request => {
      return {
        ...request,
        pickup: utils.getDatetimeValueForUnixTime(request.pickup_time),
        return: utils.getDatetimeValueForUnixTime(request.return_time)
      }
    })
  const times = sqlite.get('SELECT start_time, end_time FROM trips WHERE id = ?', tripId)

  return {
    trip_id: tripId,
    request_details: requested_vehicles[0]?.request_details,
    requested_vehicles: requested_vehicles.length > 0 ? requested_vehicles : undefined,
    default_pickup_time: utils.getDatetimeValueForUnixTime(times.start_time),
    default_return_time: utils.getDatetimeValueForUnixTime(times.end_time)
  }
}

function getIndividualGearData (tripId) {
  const gear = sqlite.all('SELECT id, name, size_type FROM trip_required_gear WHERE trip = ?', tripId)
  return { trip_id: tripId, individual_gear: gear }
}

function getGroupGearData (tripId) {
  const gear = sqlite.all('SELECT rowid as id, name, quantity FROM group_gear_requests WHERE trip = ?', tripId)
  console.log(gear)
  return { trip_id: tripId, group_gear: gear }
}
