import * as gear from './gear.js'

export function getPrintView (req, res) {
  const tripId = req.params.tripId
  const individual_gear = gear.getIndividualRequestedGear(req.db, tripId)
  const group_gear = gear.getGroupRequestedGear(req.db, tripId)
  res.render('trip/gear/print.njk', { trip_id: tripId, individual_gear, group_gear })
}

