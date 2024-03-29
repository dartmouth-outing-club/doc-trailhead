import fs from 'node:fs'

const vehicles = getRecordsFromFile('./tables/vehicles.bson.json')
const vehicleFields = ['_id', 'name', 'type', 'active']
printInsertStatements(vehicles, vehicleFields, 'vehicles')

const clubs = getRecordsFromFile('./tables/clubs.bson.json')
const clubFields = ['_id', 'name', 'active']
printInsertStatements(clubs, clubFields, 'clubs')

const users = getRecordsFromFile('./tables/users.bson.json')
const userFields = ['_id', ['casID', 'cas_id'], 'email', 'password', 'name', 'photo_url',
  'pronoun', 'dash_number', 'allergies_dietary_restrictions', 'medical_conditions', 'clothe_size',
  'shoe_size', 'height', ['role', 'is_opo']]
printInsertStatements(users, userFields, 'users')

const user_certs = users.flatMap(user => {
  const certs = []
  const userId = user._id.$oid
  if (user.driver_cert) {
    certs.push({ user: userId, cert: user.driver_cert, is_approved: true })
  } else if (user.requested_certs?.driver_cert) {
    certs.push({ user: userId, cert: user.requested_certs.driver_cert, is_approved: false })
  }
  if (user.trailer_cert) {
    certs.push({ user: userId, cert: 'TRAILER', is_approved: true })
  } else if (user.requested_certs?.trailer_cert) {
    certs.push({ user: userId, cert: 'TRAILER', is_approved: false })
  }
  return certs
})
printInsertStatements(user_certs, ['user', 'cert', 'is_approved'], 'user_certs')

const club_leaders = users
  .flatMap(user => user?.leader_for?.map(club => ({ user: user._id.$oid, club: club.$oid, is_approved: true })))
  .filter(record => record)
  .filter(record => record.user && record.club)
printInsertStatements(club_leaders, ['user', 'club', 'is_approved'], 'club_leaders')

const club_requested_leaders = users
  .flatMap(user => user?.requested_clubs?.map(club => ({
    user: user._id.$oid,
    club: club.$oid || club._id || club,
    is_approved: false
  })))
  .filter(record => record)
  .filter(record => record.user && record.club)
printInsertStatements(club_requested_leaders, ['user', 'club', 'is_approved'], 'club_leaders')

const vehicleRequests = getRecordsFromFile('./tables/vehiclerequests.bson.json').map(request => {
  let is_approved
  if (request.status === 'approved') is_approved = 1
  if (request.status === 'denied') is_approved = 0
  return {
    ...request,
    trip: request.associatedTrip?.$oid,
    requester: request.requester.$oid,
    num_participants: request.noOfPeople?.$numberInt,
    mileage: request.mileage?.$numberInt,
    is_approved
  }
})
const vehicleRequestFields = ['_id', 'requester', ['requestDetails', 'request_details'], 'mileage',
  'num_participants', 'trip', ['requestType', 'request_type'], 'is_approved']
printInsertStatements(vehicleRequests, vehicleRequestFields, 'vehiclerequests')

const requestedVehicles = vehicleRequests.flatMap(request => {
  // console.log(request.requested_vehicles)
  return request.requestedVehicles.map(requestedVehicle => {
    const pickup_time = requestedVehicle.pickupDateAndTime?.$date?.$numberLong
    const return_time = requestedVehicle.returnDateAndTime?.$date?.$numberLong
    return {
      ...requestedVehicle,
      pickup_time,
      return_time,
      vehiclerequest: request._id.$oid
    }
  })
})

const requestedVehicleFields = [
  'vehiclerequest',
  ['vehicleType', 'type'],
  ['vehicleDetails', 'details'],
  'pickup_time',
  'return_time',
  ['trailerNeeded', 'trailer_needed'],
  ['passNeeded', 'pass_needed']
]
printInsertStatements(requestedVehicles, requestedVehicleFields, 'requested_vehicles')

const assignments = getRecordsFromFile('./tables/assignments.bson.json').map(assignment => ({
  ...assignment,
  vehiclerequest: assignment.request.$oid,
  requester: assignment.requester.$oid,
  vehicle: assignment.assigned_vehicle.$oid,
  pickup_time: assignment.assigned_pickupDateAndTime.$date.$numberLong,
  return_time: assignment.assigned_returnDateAndTime.$date.$numberLong,
  picked_up: assignment.pickedUp || false,
  returned: assignment.returned || false,
  response_index: assignment.responseIndex.$numberInt
}))
const assignmentFields = ['_id', 'vehiclerequest', 'requester', 'pickup_time', 'return_time',
  ['assigned_key', 'vehicle_key'], 'vehicle', 'picked_up', 'returned', 'response_index']
printInsertStatements(assignments, assignmentFields, 'assignments')

const trips = getRecordsFromFile('./tables/trips.bson.json').map(trip => {
  let group_gear_approved, member_gear_approved
  if (trip.gearStatus === 'approved') group_gear_approved = 1
  if (trip.gearStatus === 'denied') group_gear_approved = 0
  if (trip.trippeeGear === 'approved') member_gear_approved = 1
  if (trip.trippeeGear === 'denied') member_gear_approved = 0

  const newTrip = {
    ...trip,
    club: trip.club.$oid || trip.club,
    owner: trip.owner.$oid,
    start_time: trip.startDateAndTime?.$date?.$numberLong,
    end_time: trip.endDateAndTime?.$date?.$numberLong,
    group_gear_approved,
    member_gear_approved,
    cost: trip.cost?.$numberInt,
    vehicle_request: trip.vehicleRequest?.$oid
  }
  newTrip.trippee_gear = trip.trippeeGear.map(gear => {
    const { sizeType, name, quantity } = gear
    return { sizeType, name, quantity: quantity?.$numberInt }
  })

  newTrip.opo_gear_requests = trip.OPOGearRequests.map(gear => {
    const { sizeType, name, quantity } = gear
    return { sizeType, name, quantity: quantity?.$numberInt }
  })
  return newTrip
})
const tripFields = [
  '_id', 'title', 'private', 'past', 'left', 'returned', ['markedLate', 'marked_late'], 'club',
  'owner', 'start_time', 'end_time', 'location', 'pickup', 'dropoff', 'cost', 'description',
  ['experienceNeeded', 'experience_needed'], ['coLeaderCanEditTrip', 'coleader_can_edit'],
  'group_gear_approved', 'member_gear_approved', ['sentEmails', 'sent_emails']
]
printInsertStatements(trips, tripFields, 'trips')

const tripRequiredGear = trips.flatMap(trip => {
  return trip.trippeeGear.map(gear => {
    return {
      _id: gear._id,
      trip: trip._id.$oid,
      name: gear.name,
      size_type: gear.sizeType
    }
  })
})
printInsertStatements(tripRequiredGear, ['_id', 'name', 'trip', 'size_type'], 'trip_required_gear')

const tripPcardRequests = trips
  .filter(trip => trip.pcard.at(0))
  .map(trip => {
    const pcard = trip.pcard.at(0)
    const other_costs = pcard.otherCosts.map(item => ({ title: item.title, cost: item.cost.$numberInt }))
    return {
      trip: trip._id.$oid,
      num_people: pcard.numPeople.$numberInt,
      snacks: pcard.snacks?.$numberInt,
      breakfast: pcard.breakfass?.$numberInt,
      lunch: pcard.luncs?.$numberInt,
      dinner: pcard.dinnes?.$numberInt,
      assigned_pcard: trip.pcardAssigned,
      other_costs: JSON.stringify(other_costs)
    }
  })
printInsertStatements(tripPcardRequests, ['trip', 'num_people', 'snacks', 'breakfast', 'lunch', 'dinner', 'other_costs', 'assigned_pcard'], 'trip_pcard_requests')

const group_gear_requests = trips.flatMap(trip => {
  return trip.OPOGearRequests.map(gear => {
    return {
      trip: trip._id.$oid,
      name: gear.name,
      quantity: gear.quantity.$numberInt
    }
  })
})
printInsertStatements(group_gear_requests, ['name', 'trip', 'quantity'], 'group_gear_requests')

const tripMembers = trips.flatMap(trip => {
  const leaders = trip.leaders?.map(leader => leader.$oid) || []
  const pendingUsers = trip.pending?.map(pender => pender.user.$oid) || []
  const allMembers = [...trip.members, ...trip.pending]
  return allMembers.map(member => {
    const user = member.user?.$oid
    if (!user) return undefined

    return {
      user,
      pending: pendingUsers.includes(user),
      leader: leaders.includes(user),
      attended: member.attended || false,
      requested_gear: member.requestedGear,
      trip: trip._id.$oid
    }
  }) || []
}).filter(item => item)
printInsertStatements(tripMembers, ['trip', 'user', 'leader', 'attended', 'pending'], 'trip_members')

const member_gear_requests = tripMembers.flatMap(member => (
  member.requested_gear.map(gear => {
    const gearId = gear.gearId || gear._id?.$oid || gear._id
    return { trip: member.trip, user: member.user, gear: gearId }
  })
))
printInsertStatements(member_gear_requests, ['trip', 'user', 'gear'], 'member_gear_requests')

function getRecordsFromFile (fileName) {
  const contents = fs.readFileSync(fileName).toString()
  const records = contents
    .split('\n')
    .filter(item => item)
    .map(JSON.parse)
  return records
}

function printInsertStatements (records, fields, tableName) {
  const recordFields = records.map(record => (
    fields.map(field => {
      if (field === '_id') {
        return record._id.$oid
      } else {
        const fieldName = typeof field === 'string' ? field : field[0]
        return record[fieldName]
      }
    }).map(sqlize)
  ))
  const fieldNames = fields.map(field => typeof field === 'string' ? field : field[1])
  const inserts = recordFields.map(record => `(${record.join(',')})`)
  const statements = `
INSERT OR IGNORE INTO ${tableName} (${fieldNames.join(',')}) VALUES
${inserts.join(',\n')};
`
  console.log(statements)
}

function sqlize (value) {
  if (value === undefined || value === null) {
    return 'NULL'
  } else if (typeof value === 'boolean') {
    return value === true ? 'TRUE' : 'FALSE'
  } else if (typeof value === 'string') {
    return `'${value.replaceAll("'", "''")}'`
  } else if (typeof value === 'object') {
    const jsonString = JSON.stringify(value)
    return `'${jsonString.replaceAll("'", "''")}'`
  } else {
    return value
  }
}
