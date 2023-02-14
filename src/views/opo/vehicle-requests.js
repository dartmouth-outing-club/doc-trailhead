import * as utils from '../../utils.js'
import * as sqlite from '../../services/sqlite.js'
import { getBadgeImgElement } from '../../utils.js'

export function get (_req, res) {
  const requests = getVehicleRequests().map(getRowData)
  const reviewed_requests = requests.filter(request => request.is_pending === 0)
  const pending_requests = requests.filter(request => request.is_pending === 1)
  res.render('views/opo/vehicle-requests.njk', { reviewed_requests, pending_requests })
}

function getVehicleRequests () {
  const now = new Date()
  return sqlite.all(`
    SELECT
      vehiclerequests.id,
      users.name as requester_name,
      trips.id as trip_id,
      iif(trips.id IS NOT NULL, trips.title, request_details) as reason,
      first_pickup,
      last_return,
      iif(is_approved IS NULL, 1, 0) as is_pending,
      iif(is_approved IS NULL, 'pending', iif(is_approved = 1, 'approved', 'denied')) as status
    FROM vehiclerequests
    LEFT JOIN (
      SELECT vehiclerequest, min(pickup_time) AS first_pickup, max(return_time) AS last_return
      FROM requested_vehicles
      GROUP BY vehiclerequest
    ) ON vehiclerequest = vehiclerequests.id
    LEFT JOIN users ON users.id = vehiclerequests.requester
    LEFT JOIN trips ON trips.id = vehiclerequests.trip
    WHERE last_return > ?
    ORDER BY first_pickup ASC
`, now.getTime())
}

function getRowData (request) {
  return {
    reason: request.reason,
    requester_name: request.requester_name,
    is_pending: request.is_pending,
    pickup_time_element: utils.getShortTimeElement(request.first_pickup),
    return_time_element: utils.getShortTimeElement(request.last_return),
    status_element: getBadgeImgElement(request.status)
  }
}
