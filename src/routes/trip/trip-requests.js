import { BadRequestError } from '../../request/errors.js'
import * as utils from '../../utils.js'

export function getRequestsView(req, res) {
  const tripId = req.params.tripId
  const statuses = req.db.get(`
    SELECT
      member_gear_approved,
      group_gear_approved,
      vehiclerequests.is_approved AS vehiclerequest_approved,
      trip_pcard_requests.is_approved AS pcard_approved
    FROM trips
    LEFT JOIN vehiclerequests ON trips.id = vehiclerequests.trip
    LEFT JOIN trip_pcard_requests ON trips.id = trip_pcard_requests.trip
    WHERE trips.id = ?
  `, tripId)
  const vehicleData = statuses.vehiclerequest_approved ? { vehiclerequest_locked: true } : getVehicleRequestData(req, tripId)
  const individualGearData = statuses.member_gear_approved ? { individual_gear_locked: true } : getIndividualGearData(req, tripId)
  const groupGearData = statuses.group_gear_approved ? { group_gear_locked: true } : getGroupGearData(req, tripId)
  const pcardData = statuses.pcard_approved ? { pcard_locked: true } : getPcardData(req, tripId)
  res.render('views/trip-requests.njk', {
    trip_id: tripId,
    ...vehicleData,
    ...individualGearData,
    ...groupGearData,
    ...pcardData
  })
}

function getVehicleRequestData(req, tripId) {
  const requested_vehicles = req.db.all(`
    SELECT type, pickup_time, return_time, trailer_needed, pass_needed, request_details
    FROM requested_vehicles
    LEFT JOIN vehiclerequests ON vehiclerequests.id = requested_vehicles.vehiclerequest
    WHERE vehiclerequests.trip = ?
  `, tripId)
    .map(request => {
      return {
        ...request,
        pickup: utils.getDatetimeValueForUnixTime(request.pickup_time),
        return: utils.getDatetimeValueForUnixTime(request.return_time)
      }
    })
  const times = req.db.get('SELECT start_time, end_time FROM trips WHERE id = ?', tripId)

  return {
    trip_id: tripId,
    request_details: requested_vehicles[0]?.request_details,
    requested_vehicles: requested_vehicles.length > 0 ? requested_vehicles : undefined,
    default_pickup_time: utils.getDatetimeValueForUnixTime(times.start_time),
    default_return_time: utils.getDatetimeValueForUnixTime(times.end_time)
  }
}

function getIndividualGearData(req, tripId) {
  const gear = req.db.all('SELECT id, name, size_type FROM trip_required_gear WHERE trip = ?', tripId)
  // TODO it's insane that I'm returning the parameter again
  return { trip_id: tripId, individual_gear: gear }
}

function getGroupGearData(req, tripId) {
  const gear = req.db.all('SELECT rowid as id, name, quantity FROM group_gear_requests WHERE trip = ?', tripId)
  return { trip_id: tripId, group_gear: gear }
}

function getPcardData(req, tripId) {
  const pcard = req.db.get(`
    SELECT is_approved, num_people, snacks, breakfast, lunch, dinner
    FROM trip_pcard_requests
    WHERE trip = ?
  `, tripId)

  if (!pcard) {
    const pcard_request = { hide: true, num_people: 0, snacks: 0, breakfast: 0, lunch: 0, dinner: 0 }
    return { trip_id: tripId, pcard_request }
  } else {
    const pcard_request = pcard
    pcard_request.other_costs = req.db
      .all('SELECT id, name, cost FROM pcard_request_costs WHERE trip = ?', tripId)
    return { trip_id: tripId, pcard_request }
  }
}

export function putVehicleRequest(req, res) {
  const input = { ...req.body }
  const tripId = req.params.tripId

  // The client will append a number to end of each field
  // Loops through the fields until you run out of valid numbers
  // Validate return time comes after pickup time
  let index = 1
  const vehicles = []
  while (input[`type-${index}`]) {
    const pickup_time = (new Date(input[`pickup-${index}`])).getTime()
    const return_time = (new Date(input[`return-${index}`])).getTime()

    if (pickup_time > return_time) {
      throw new BadRequestError('Pickup time must be before return time')
    }

    const vehicle = {
      type: input[`type-${index}`],
      pickup_time,
      return_time,
      trailer_needed: input[`trailer_needed-${index}`] ? 1 : 0,
      pass_needed: input[`pass_needed-${index}`] ? 1 : 0
    }
    vehicles.push(vehicle)
    index++
  }

  // Delete the old request
  req.db.run('DELETE FROM vehiclerequests WHERE trip = ?', tripId)

  // End if there are no vehicles anymore
  if (vehicles.length === 0) {
    return res.render('components/save-complete-button.njk')
  }

  const info = req.db.run(`
      INSERT INTO vehiclerequests (requester, request_details, trip)
      VALUES (?, ?, ?)
      `, req.user, input.notes, tripId)
  const vehiclerequestId = info.lastInsertRowid

  // Point all the vehicles to the new request
  vehicles.forEach(vehicle => { vehicle.vehiclerequest = vehiclerequestId })

  req.db.runMany(`
    INSERT INTO requested_vehicles
      (vehiclerequest, type, pickup_time, return_time, trailer_needed, pass_needed)
    VALUES (@vehiclerequest, @type, @pickup_time, @return_time, @trailer_needed, @pass_needed)
  `, vehicles)

  res.render('components/save-complete-button.njk')
}

export function putIndividualGear(req, res) {
  const tripId = req.params.tripId
  const input = { ...req.body }
  const items = Array.isArray(input.item) ? input.item : [input.item]
  const measurements = Array.isArray(input.measurement) ? input.measurement : [input.measurement]

  if (items.length !== measurements.length) return res.sendStatus(400)
  if (!items[0]) return res.sendStatus(204)

  const gear = items.map((item, index) => {
    return { trip: tripId, name: item, size_type: measurements[index] }
  })

  req.db.runMany(`
    INSERT INTO trip_required_gear (trip, name, size_type)
    VALUES (@trip, @name, @size_type)
  `, gear)

  const data = getIndividualGearData(req, tripId)
  res.render('requests/individual-gear.njk', { ...data })
}

export function deleteIndividualGear(req, res) {
  const { tripId, gearId } = req.params
  req.db.run('DELETE FROM trip_required_gear WHERE id = ? AND trip = ?', gearId, tripId)
  const data = getIndividualGearData(req, tripId)
  res.render('requests/individual-gear.njk', { ...data })
}

export function putGroupGear(req, res) {
  const tripId = req.params.tripId
  const input = { ...req.body }
  const items = Array.isArray(input.item) ? input.item : [input.item]
  const quantities = Array.isArray(input.quantity) ? input.quantity : [input.quantity]

  if (items.length !== quantities.length) return res.sendStatus(400)
  if (!items[0]) return res.sendStatus(204)

  const gear = items.map((item, index) => {
    return { trip: tripId, name: item, quantity: quantities[index] }
  })

  req.db.runMany(`
    INSERT INTO group_gear_requests (trip, name, quantity)
    VALUES (@trip, @name, @quantity)
  `, gear)

  const data = getGroupGearData(req, tripId)
  res.render('requests/group-gear.njk', { ...data })
}

export function deleteGroupGear(req, res) {
  const { tripId, gearId } = req.params
  req.db.run('DELETE FROM group_gear_requests WHERE rowid = ? AND trip = ?', gearId, tripId)
  const data = getGroupGearData(req, tripId)
  res.render('requests/group-gear.njk', { ...data })
}

export function putPcardRequest(req, res) {
  const tripId = req.params.tripId
  const { cost_name, cost_dollars } = req.body

  const costNames = Array.isArray(cost_name) ? cost_name : [cost_name]
  const costValues = Array.isArray(cost_dollars) ? cost_dollars : [cost_dollars]
  if (costNames.length !== costValues.length) return res.sendStatus(400)

  // TODO sanitize input further (right now the SQL will just return a 500 if they're not numbers)
  const input = {
    trip: tripId,
    num_people: req.body.people || 0,
    snacks: req.body.snacks || 0,
    breakfast: req.body.breakfast || 0,
    lunch: req.body.lunch || 0,
    dinner: req.body.dinner || 0
  }

  req.db.run('DELETE FROM trip_pcard_requests WHERE trip = ?', tripId)
  req.db.run(`
    INSERT INTO trip_pcard_requests (trip, num_people, snacks, breakfast, lunch, dinner)
    VALUES (@trip, @num_people, @snacks, @breakfast, @lunch, @dinner)
  `, input)

  if (costNames[0]) {
    const otherCosts = costNames.map((name, index) => {
      return { trip: tripId, name, cost: costValues[index] }
    })
    req.db.runMany(
      'INSERT INTO pcard_request_costs (trip, name, cost) VALUES (@trip, @name, @cost)',
      otherCosts
    )
    const data = getPcardData(req, tripId)
    res.render('requests/pcard-request.njk', { ...data })
  } else {
    res.set('HX-Retarget', '#pcard-save-button')
    res.render('components/save-complete-button.njk')
  }
}

export function deletePcardRequest(req, res) {
  const tripId = req.params.tripId
  req.db.run('DELETE FROM trip_pcard_requests WHERE trip = ?', tripId)
  req.db.run('DELETE FROM pcard_request_costs WHERE trip = ?', tripId)
  res.render('requests/pcard-request.njk', getPcardData(req, tripId))
}

export function deleteOtherCost(req, res) {
  const { tripId, costId } = req.params
  req.db.run('DELETE FROM pcard_request_costs WHERE rowid = ? AND trip = ?', costId, tripId)
  res.render('requests/pcard-request.njk', getPcardData(req, tripId))
}
