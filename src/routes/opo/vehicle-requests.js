import * as utils from '../../utils.js'
import { getBadgeImgElement } from '../../utils.js'

export function get(req, res) {
  //const requests = getRequestedVehicles(req).map(getRowData)
  const requests = getVehicleRequests(req).map(getRowData)
    console.log(requests)
  const reviewed_requests = requests.filter(request => request.status !== 'pending')
  const pending_requests = requests.filter(request => request.status === 'pending')

  //res.render('views/opo/vehicle-requests.njk', { reviewed_requests, requests })
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

function getRequestedVehicles(req) {
  const now = new Date()
    // select all info from 
    let requested = []
    return req.db.all(`
        SELECT vehiclerequest, pickup_time, return_time, mileage from requested_vehicles where pickup_time > ? `, now.getTime()
    )

    /*.forEach((vehicle, index) => {
        const request = req.db.get(`SELECT trip, requester from vehiclerequests where id = ? AND is_approved = FALSE`, vehicle.vehiclerequest)
        if (request){
            const user = req.db.get(`SELECT name from users where id = ?`, request.requester)
            const trip_name = req.db.get(`SELECT title from trips where id = ?`, request.trip)
            const extended_vehicle = {..vehicle, user, trip_name}
            requested.put(extended_vehicle)
        }
    })
    */
}

function getRowData(request) {
  return {
    ...request,
    pickup_time_element: utils.getDatetimeElement(request.first_pickup),
    return_time_element: utils.getDatetimeElement(request.last_return),
    //pickup_time_element: utils.getDatetimeElement(request.pickup_time),
    //return_time_element: utils.getDatetimeElement(request.return_time),
    status_element: getBadgeImgElement(request.status)
  }
}
