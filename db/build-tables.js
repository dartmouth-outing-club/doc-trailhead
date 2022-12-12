import fs from 'node:fs'

const vehicles = getRecordsFromFile('./tables/vehicles.bson.json')
const vehicleFields = ['_id', 'name', 'type', 'active']
console.log(getInsertStatementFromRecords(vehicles, vehicleFields, 'vehicles'))

const clubs = getRecordsFromFile('./tables/clubs.bson.json')
const clubFields = ['_id', 'name', 'active']
console.log(getInsertStatementFromRecords(clubs, clubFields, 'clubs'))

const users = getRecordsFromFile('./tables/users.bson.json')
const userFields = ['_id', ['casID', 'cas_id'], 'email', 'password', 'name', 'photo_url',
  'pronoun', 'dash_number', 'allergies_dietary_restrictions', 'medical_conditions', 'clothe_size',
  'shoe_size', 'height', 'role', 'has_pending_leader_change', 'has_pending_cert_change',
  'driver_cert', 'trailer_cert', 'requested_clubs', 'requested_certs']
console.log(getInsertStatementFromRecords(users, userFields, 'users'))

const club_leaders = users
  .flatMap(user => user?.leader_for?.map(club => ({ user: user._id.$oid, club: club.$oid, is_approved: true })))
  .filter(record => record)
  .filter(record => record.user && record.club)
console.log(getInsertStatementFromRecords(club_leaders, ['user', 'club', 'is_approved'], 'club_leaders'))

const club_requested_leaders = users
  .flatMap(user => user?.requested_clubs?.map(club => ({ user: user._id.$oid, club: club.$oid, is_approved: false })))
  .filter(record => record)
  .filter(record => record.user && record.club)
console.log(getInsertStatementFromRecords(club_requested_leaders, ['user', 'club', 'is_approved'], 'club_leaders'))

const vehicleRequests = getRecordsFromFile('./tables/vehiclerequests.bson.json').map(request => ({
  ...request,
  trip: request.associatedTrip?.$oid,
  requester: request.requester.$oid,
  num_participants: request.noOfPeople?.$numberInt,
  mileage: request.mileage?.$numberInt
}))
const vehicleRequestFields = ['_id', 'requester', ['requestDetails', 'request_details'], 'mileage',
  'num_participants', 'trip', ['requestType', 'request_type'], 'status']
console.log(getInsertStatementFromRecords(vehicleRequests, vehicleRequestFields, 'vehiclerequests'))

const requestedVehicles = vehicleRequests.flatMap(request => (
  request.requestedVehicles.map(requestedVehicle => {
    const pickup_time = requestedVehicle.pickupDateAndTime?.$date?.$numberLong
    const return_time = requestedVehicle.returnDateAndTime?.$date?.$numberLong
    return {
      ...requestedVehicle,
      pickup_time,
      return_time,
      vehiclerequest: request._id.$oid
    }
  })
))
const requestedVehicleFields = [
  'vehiclerequest',
  ['vehicleType', 'type'],
  ['vehicleDetails', 'details'],
  'pickup_time',
  'return_time',
  ['trailerNeeded', 'trailer_needed'],
  ['passNeeded', 'pass_needed'],
  ['recurringVehicle', 'recurring_vehicle']
]
console.log(getInsertStatementFromRecords(requestedVehicles, requestedVehicleFields, 'requested_vehicles'))

const assignments = getRecordsFromFile('./tables/assignments.bson.json').map(assignment => ({
  ...assignment,
  request: assignment.request.$oid,
  requester: assignment.requester.$oid,
  vehicle: assignment.assigned_vehicle.$oid,
  pickup_time: assignment.assigned_pickupDateAndTime.$date.$numberLong,
  return_time: assignment.assigned_returnDateAndTime.$date.$numberLong,
  picked_up: assignment.pickedUp || false,
  returned: assignment.returned || false
}))
const assignmentFields = ['_id', 'request', 'requester', 'pickup_time', 'return_time',
  ['assigned_key', 'vehicle_key'], 'vehicle', 'picked_up', 'returned']
console.log(getInsertStatementFromRecords(assignments, assignmentFields, 'assignments'))

const trips = getRecordsFromFile('./tables/trips.bson.json').map(trip => ({
  ...trip,
  club: trip.club.$oid,
  owner: trip.owner.$oid,
  start_time: trip.startDateAndTime?.$date?.$numberLong,
  end_time: trip.endDateAndTime?.$date?.$numberLong,
  cost: trip.cost?.$numberInt,
  vehicle_request: trip.vehicleRequest?.$oid
}))
const tripFields = [
  '_id',
  'name',
  'title',
  'private',
  'past',
  'left',
  'returned',
  ['markedLate', 'marked_late'],
  'club',
  'owner',
  'start_time',
  'end_time',
  'location',
  'pickup',
  'dropoff',
  'cost',
  'description',
  ['experienceNeeded', 'experience_needed'],
  ['coLeaderCanEditTrip', 'coleader_can_edit'],
  ['OPOGearRequests', 'opo_gear_requests'],
  ['trippeeGear', 'trippee_gear'],
  ['gearStatus', 'gear_status'],
  ['trippeeGearStatus', 'trippee_gear_status'],
  'pcard',
  ['pcardStatus', 'pcard_status'],
  ['pcardAssigned', 'pcard_assigned'],
  ['vehicleStatus', 'vehicle_status'],
  ['sentEmails', 'sent_emails']
]
console.log(getInsertStatementFromRecords(trips, tripFields, 'trips'))

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
      trip: trip._id.$oid,
      requested_gear: JSON.stringify(member.requestedGear)
    }
  }) || []
}).filter(item => item)
console.log(getInsertStatementFromRecords(tripMembers, ['trip', 'user', 'leader', 'attended', 'pending', 'requested_gear'], 'trip_members'))

function getRecordsFromFile (fileName) {
  const contents = fs.readFileSync(fileName).toString()
  const records = contents
    .split('\n')
    .filter(item => item)
    .map(JSON.parse)
  return records
}

function getInsertStatementFromRecords (records, fields, tableName) {
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
  return `
INSERT OR IGNORE INTO ${tableName} (${fieldNames.join(',')}) VALUES
${inserts.join(',\n')};
`
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
