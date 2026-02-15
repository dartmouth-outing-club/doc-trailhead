import * as utils from '../../utils.js'
import { getBadgeImgElement } from '../../utils.js'

export function get(req, res) {
  //const requests = getVehicleRequests(req).map(getRowData)

  const requests = getRequestedVehicles(req).map(getRowData)
  //console.log(requests)

  const reviewed_requests = requests.filter(request => request.status !== 'pending')
  const pending_requests = requests.filter(request => request.status === 'pending')
    //TODO: get status lmao

  //res.render('views/opo/vehicle-requests.njk', { requests, requests })
  res.render('views/opo/vehicle-requests.njk', { reviewed_requests, pending_requests })
}

function getVehicleRequests(req) {
  const now = new Date()
  return req.db.all(`
    SELECT
      vehiclerequests.id,
      users.name as requester_name,
      requested_vehicles.trip_mileage,
      requested_vehicles.average_mileage,
      trips.id as trip_id,
      iif(trips.id IS NOT NULL, trips.title, request_details) as reason,
      first_pickup,
      last_return,
      requested_vehicles.vcount,
      iif(is_approved IS NULL, 'pending', iif(is_approved = 1, 'approved', 'denied')) as status
    FROM vehiclerequests
    LEFT JOIN (
      SELECT vehiclerequest, max(mileage) as trip_mileage, avg(mileage) as average_mileage, min(pickup_time) AS first_pickup, max(return_time) AS last_return, count(*) as vcount
      FROM requested_vehicles
      GROUP BY vehiclerequest
    ) AS REQUESTED_VEHICLES ON vehiclerequest = vehiclerequests.id
    LEFT JOIN users ON users.id = vehiclerequests.requester
    LEFT JOIN trips ON trips.id = vehiclerequests.trip
    WHERE last_return > ?
    ORDER BY first_pickup ASC
`, now.getTime())
}
/*
 * For all requested vehicles, get trip info frm vehicle request 
 *     trip.title 
 *     and user from user.id = trip.owner
 *      which is to say user.id = vehiclerequest.trip.owner 
 *  NOTE: I think this could select from trips to start and have some nested json but that is nottt happening rn...
 */

function getRequestedVehicles(req) {
  const now = new Date()
    // select all info from 
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
        ORDER BY trip_id
`, now.getTime()
    )
    /*
      vehiclerequests.id,
      users.name as requester_name,
      //requested_vehicles.trip_mileage,
      //requested_vehicles.average_mileage,
      trips.id as trip_id,
      iif(trips.id IS NOT NULL, trips.title, request_details) as reason,
      first_pickup,
      last_return,
      requested_vehicles.vcount,
      iif(is_approved IS NULL, 'pending', iif(is_approved = 1, 'approved', 'denied')) as status
    */
    //TODO: check times

}

function getRowData(request) {
  return {
    ...request,
    pickup_time_element: utils.getDatetimeElement(request.pickup_time),
    return_time_element: utils.getDatetimeElement(request.return_time),
    status_element: getBadgeImgElement(request.status)
  }
}
