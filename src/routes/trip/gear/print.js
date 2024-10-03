import * as gear from './gear.js'
import * as utils from '../../../utils.js'

export function getPrintView(req, res) {
  const tripId = req.params.tripId
  const trip = req.db.get(`
    SELECT
      trips.id,
      title,
      start_time,
      end_time,
      users.name as owner_name,
      clubs.name as club_name
    FROM trips
    LEFT JOIN users ON trips.owner = users.id
    LEFT JOIN clubs ON trips.club = clubs.id
    WHERE trips.id = ?
    `, tripId)

  trip.start_time = utils.getDatetimeElement(trip.start_time)
  trip.end_time = utils.getDatetimeElement(trip.end_time)

  const individual_gear = gear.getIndividualRequestedGear(req.db, tripId)
  const group_gear = gear.getGroupRequestedGear(req.db, tripId)
  res.render('trip/gear/print.njk', { trip, individual_gear, group_gear })
}
