import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'

export function renderVehicleRequestTable (res, vehicleRequestId) {
  const data = getVehicleRequestData(vehicleRequestId)
  res.render('requests/vehicle-request-table.njs', { ...data })
}

export function getVehicleRequestView (req, res) {
  const data = getVehicleRequestData(req.params.vehicleRequestId)
  res.render('views/vehicle-request.njs', { ...data })
}

export function getVehicleRequestData (vehicleRequestId) {
  const available_vehicles = sqlite.getActiveVehicles()
  // Note the ORDER BY ensures that the response_index is lined up
  const is_approved = sqlite
    .get('SELECT is_approved FROM vehiclerequests WHERE id = ?', vehicleRequestId)
    .is_approved

  const requestStatus = is_approved === null ? 'pending' : is_approved
  const requestedVehicles = sqlite.all(`
    SELECT
      type,
      details,
      pickup_time,
      return_time,
      iif(trailer_needed = 1, 'Yes', 'No') as trailer_needed,
      iif(pass_needed = 1, 'Yes', 'No') as pass_needed
    FROM requested_vehicles
    WHERE vehiclerequest = ?
  `, vehicleRequestId)
  const assignedVehicles = sqlite.all(`
    SELECT
      vehicles.id as id,
      vehicles.name as name,
      vehicle_key,
      pickup_time as assigned_pickup_time,
      return_time as assigned_return_time
    FROM assignments
    LEFT JOIN vehicles ON vehicles.id = assignments.vehicle
    WHERE vehiclerequest = ?
    ORDER BY response_index ASC
  `, vehicleRequestId)

  // This is annoying holdover from the old frontend
  // Once we've migrated to the new frontend we can properly link these in the db
  const vehicles = requestedVehicles.map((requestedVehicle, index) => {
    return { ...requestedVehicle, ...assignedVehicles.at(index) }
  })
  const defaultTimes = sqlite.get(`
    SELECT start_time, end_time
    FROM vehiclerequests
    LEFT JOIN trips ON trips.id = vehiclerequests.trip
    WHERE vehiclerequests.id = ?`, vehicleRequestId)

  const requested_vehicles = vehicles.map(vehicle => {
    const assigned_pickup = vehicle.assigned_pickup_time || defaultTimes.start_time
    const assigned_return = vehicle.assigned_return_time || defaultTimes.end_time
    return {
      ...vehicle,
      pickup_time: utils.getLongTimeElement(vehicle.pickup_time),
      return_time: utils.getLongTimeElement(vehicle.return_time),
      assigned_pickup_time: utils.getDatetimeValueForUnixTime(assigned_pickup),
      assigned_return_time: utils.getDatetimeValueForUnixTime(assigned_return)
    }
  })

  return {
    vehiclerequest_id: vehicleRequestId,
    available_vehicles,
    requested_vehicles,
    vehiclerequest_is_approved: is_approved,
    vehiclerequest_badge: utils.getBadgeImgElement(requestStatus)
  }
}
