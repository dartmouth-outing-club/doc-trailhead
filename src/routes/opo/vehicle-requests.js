import * as utils from '../../utils.js'
import { getBadgeImgElement } from '../../utils.js'

export function get(req, res) {
  const requests = getRequestedVehicles(req).map(getRowData)
  const reviewed_requests = requests.filter(request => request.status !== 'pending')
  const pending_requests = requests.filter(request => request.status === 'pending')
  res.render('views/opo/vehicle-requests.njk', { reviewed_requests, pending_requests })
}

function getRequestedVehicles(req) {
  const now = new Date()
  return req.db.all(`
      SELECT 
        vehiclerequest, 
        pickup_time, 
        return_time, 
        requested_vehicles.mileage,
        users.name as requester_name,
        trips.id as trip_id,
        trips.title as reason,
        iif(vehiclerequests.is_approved IS NULL, 'pending', iif(is_approved = 1, 'approved', 'denied')) as status
      FROM requested_vehicles 
      JOIN vehiclerequests ON vehiclerequests.id = requested_vehicles.vehiclerequest
      JOIN trips ON trips.id = vehiclerequests.trip
      JOIN users on users.id =  trips.owner 
      where pickup_time > ? 
      ORDER BY trip_id `, now.getTime()
  )
}

function getRowData(request) {
  return {
    ...request,
    pickup_time_element: utils.getDatetimeElement(request.pickup_time),
    return_time_element: utils.getDatetimeElement(request.return_time),
    status_element: getBadgeImgElement(request.status)
  }
}
