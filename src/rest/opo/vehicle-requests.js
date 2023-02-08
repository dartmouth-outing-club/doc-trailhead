import * as utils from '../../utils.js'
import * as sqlite from '../../services/sqlite.js'
import { getBadgeImgElement } from '../../utils.js'

function getVehicleRequests (showReviewed) {
  const now = new Date()
  return sqlite.all(`
    SELECT
      vehiclerequests.id,
      users.name as requester_name,
      trips.id as trip_id,
      iif(trips.id IS NOT NULL, trips.title, request_details) as reason,
      first_pickup,
      last_return,
      iif(is_approved IS NULL, 'pending', iif(is_approved = 1, 'approved', 'denied')) as status
    FROM vehiclerequests
    LEFT JOIN (
      SELECT vehiclerequest, min(pickup_time) AS first_pickup, max(return_time) AS last_return
      FROM requested_vehicles
      GROUP BY vehiclerequest
    ) ON vehiclerequest = vehiclerequests.id
    LEFT JOIN users ON users.id = vehiclerequests.requester
    LEFT JOIN trips ON trips.id = vehiclerequests.trip
    WHERE last_return > ? AND is_approved ${showReviewed ? 'IS NOT' : 'IS'} NULL
    ORDER BY first_pickup ASC
`, now.getTime())
}

function convertRequestsToTable (trips, showStatus) {
  const rows = trips
    .map(request => {
      return `
<tr>
<td><a href="/leader/trip/${request.trip_id}#vehicle-request">${request.reason}</a>
<td>${request.requester_name}
<td>${utils.getShortTimeElement(request.first_pickup)}
<td>${utils.getShortTimeElement(request.last_return)}
${showStatus ? `<td>${getBadgeImgElement(request.status)}` : ''}
</tr>
`
    })

  // Show a little notice if the table is empty
  if (rows.length === 0) {
    const selector = showStatus ? '.reviewed table' : '.pending table'
    return `<div hx-swap-oob="outerHTML:${selector}"><div class=notice>All set for now</div></div>`
  }

  return rows.join('')
}

export function get (req, res) {
  const showReviewed = req.query.show_reviewed === 'true'
  const trips = getVehicleRequests(showReviewed)
  const rows = convertRequestsToTable(trips, showReviewed)
  res.send(rows).status(200)
}
