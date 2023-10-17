const _30_DAYS_IN_MS = 2592000000

export function get (req, res) {
  const lastLimit = (new Date()).getTime() - _30_DAYS_IN_MS
  const vehicles = req.db.getActiveVehicles().map(vehicle => {
    return { id: vehicle.id, title: vehicle.name, eventColor: 'rgb(72, 158, 119)' }
  })
  const assignments = req.db.all(`
    SELECT
      iif(trips.title IS NULL, vehiclerequests.request_details, trips.title) AS title,
      vehicle as 'resourceId',
      pickup_time AS start,
      return_time AS end
    FROM assignments
    LEFT JOIN vehiclerequests ON vehiclerequests.id = assignments.vehiclerequest
    LEFT JOIN trips ON trips.id = vehiclerequests.trip
    WHERE end_time > ?
  `, lastLimit)
  res.json({ resources: vehicles, events: assignments })
}
