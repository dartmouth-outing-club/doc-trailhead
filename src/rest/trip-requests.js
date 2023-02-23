import * as sqlite from '../services/sqlite.js'
import * as tripRequests from '../views/trip-requests.js'

export function putVehicleRequest (req, res) {
  const input = { ...req.body }
  const tripId = req.params.tripId

  sqlite.run('DELETE FROM vehiclerequests WHERE trip = ?', tripId)
  const info = sqlite.run(`
      INSERT INTO vehiclerequests (requester, request_details, trip)
      VALUES (?, ?, ?)
      `, req.user, input.notes, tripId)
  const vehiclerequestId = info.lastInsertRowid

  // The client will append a number to end of each field
  // Loops through the fields until you run out of valid numbers
  let index = 1
  const vehicles = []
  while (input[`type-${index}`]) {
    const vehicle = {
      vehiclerequest: vehiclerequestId,
      type: input[`type-${index}`],
      pickup_time: (new Date(input[`pickup-${index}`])).getTime(),
      return_time: (new Date(input[`return-${index}`])).getTime(),
      trailer_needed: input[`trailer_needed-${index}`] ? 1 : 0,
      pass_needed: input[`pass_needed-${index}`] ? 1 : 0
    }
    vehicles.push(vehicle)
    index++
  }

  sqlite.runMany(`
    INSERT INTO requested_vehicles
      (vehiclerequest, type, pickup_time, return_time, trailer_needed, pass_needed)
    VALUES (@vehiclerequest, @type, @pickup_time, @return_time, @trailer_needed, @pass_needed)
  `, vehicles)

  res.render('components/save-complete-button.njk')
}

export function putIndividualGear (req, res) {
  const tripId = req.params.tripId
  const input = { ...req.body }
  const items = Array.isArray(input.item) ? input.item : [input.item]
  const measurements = Array.isArray(input.measurement) ? input.measurement : [input.measurement]

  if (items.length !== measurements.length) return res.sendStatus(400)
  if (!items[0]) return res.sendStatus(204)

  const gear = items.map((item, index) => {
    return { trip: tripId, name: item, size_type: measurements[index] }
  })

  sqlite.runMany(`
    INSERT INTO trip_required_gear (trip, name, size_type)
    VALUES (@trip, @name, @size_type)
  `, gear)

  tripRequests.renderIndividualGearCard(tripId, res)
}

export function deleteIndividualGear (req, res) {
  const { tripId, gearId } = req.params
  sqlite.run('DELETE FROM trip_required_gear WHERE id = ? AND trip = ?', gearId, tripId)
  tripRequests.renderIndividualGearCard(tripId, res)
}

export function putGroupGear (req, res) {
  const tripId = req.params.tripId
  const input = { ...req.body }
  const items = Array.isArray(input.item) ? input.item : [input.item]
  const quantities = Array.isArray(input.quantity) ? input.quantity : [input.quantity]

  if (items.length !== quantities.length) return res.sendStatus(400)
  if (!items[0]) return res.sendStatus(204)

  const gear = items.map((item, index) => {
    return { trip: tripId, name: item, quantity: quantities[index] }
  })

  sqlite.runMany(`
    INSERT INTO group_gear_requests (trip, name, quantity)
    VALUES (@trip, @name, @quantity)
  `, gear)

  tripRequests.renderGroupGearCard(tripId, res)
}

export function deleteGroupGear (req, res) {
  const { tripId, gearId } = req.params
  sqlite.run('DELETE FROM group_gear_requests WHERE rowid = ? AND trip = ?', gearId, tripId)
  tripRequests.renderGroupGearCard(tripId, res)
}

export function putPcardRequest (req, res) {
  const tripId = req.params.tripId
  const { people, snacks, breakfast, lunch, dinner, cost_name, cost_dollars } = req.body

  const costNames = Array.isArray(cost_name) ? cost_name : [cost_name]
  const costValues = Array.isArray(cost_dollars) ? cost_dollars : [cost_dollars]

  if (costNames.length !== costValues.length) return res.sendStatus(400)
  const otherCosts = costNames.map((name, index) => ({ trip: tripId, name, cost: costValues[index] }))

  sqlite.run('DELETE FROM trip_pcard_requests WHERE trip = ?', tripId)
  sqlite.run(`
    INSERT INTO trip_pcard_requests (trip, num_people, snacks, breakfast, lunch, dinner)
    VALUES (?, ?, ?, ?, ?, ?)
  `, tripId, people, snacks, breakfast, lunch, dinner)

  if (costNames[0]) {
    sqlite.runMany(
      'INSERT INTO pcard_request_costs (trip, name, cost) VALUES (@trip, @name, @cost)',
      otherCosts
    )
  }
  return tripRequests.renderPcardCard(tripId, res)
}

export function deletePcardRequest (req, res) {
  const tripId = req.params.tripId
  sqlite.run('DELETE FROM trip_pcard_requests WHERE trip = ?', tripId)
  sqlite.run('DELETE FROM pcard_request_costs WHERE AND trip = ?', tripId)
  tripRequests.renderPcardCard(tripId, res)
}

export function deleteOtherCost (req, res) {
  const { tripId, costId } = req.params
  sqlite.run('DELETE FROM pcard_request_costs WHERE rowid = ? AND trip = ?', costId, tripId)
  tripRequests.renderPcardCard(tripId, res)
}
