import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'

export function renderVehicleRequestCard (tripId, res) {
  const data = getVehicleRequestData(tripId)
  res.render('requests/vehicle-request-editable.njs', { ...data })
}

export function renderIndividualGearCard (tripId, res) {
  const data = getIndividualGearData(tripId)
  res.render('requests/individual-gear.njs', { ...data })
}

export function renderGroupGearCard (tripId, res) {
  const data = getGroupGearData(tripId)
  res.render('requests/group-gear.njs', { ...data })
}

export function renderPcardCard (tripId, res) {
  const data = getPcardData(tripId)
  res.render('requests/pcard-request.njs', { ...data })
}

export function getRequestsView (req, res) {
  const tripId = req.params.tripId
  const statuses = sqlite.get(`
    SELECT
      member_gear_approved,
      group_gear_approved,
      vehiclerequests.is_approved AS vehiclerequest_approved,
      trip_pcard_requests.is_approved AS pcard_approved
    FROM trips
    LEFT JOIN vehiclerequests ON trips.id = vehiclerequests.trip
    LEFT JOIN trip_pcard_requests ON trips.id = trip_pcard_requests.trip
    WHERE trips.id = ?
  `, tripId)
  const vehicleData = statuses.vehiclerequest_approved ? { vehiclerequest_locked: true } : getVehicleRequestData(tripId)
  const individualGearData = statuses.member_gear_approved ? { individual_gear_locked: true } : getIndividualGearData(tripId)
  const groupGearData = statuses.group_gear_approved ? { group_gear_locked: true } : getGroupGearData(tripId)
  const pcardData = statuses.pcard_approved ? { pcard_locked: true } : getPcardData(tripId)
  res.render('views/trip-requests.njs', {
    trip_id: tripId,
    ...vehicleData,
    ...individualGearData,
    ...groupGearData,
    ...pcardData
  })
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
  return { trip_id: tripId, group_gear: gear }
}

function getPcardData (tripId) {
  const pcard = sqlite.get(`
    SELECT is_approved, num_people, snacks, breakfast, lunch, dinner
    FROM trip_pcard_requests
    WHERE trip = ?
  `, tripId)
  return { trip_id: tripId, pcard_request: pcard }
}
