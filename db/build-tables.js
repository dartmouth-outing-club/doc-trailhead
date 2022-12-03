import fs from 'node:fs'

const vehicles = getRecordsFromFile('./tables/vehicles.bson.json').map(vehicle => {
  const _id = vehicle._id.$oid
  return { ...vehicle, _id }
})
const vehicleFields = ['_id', 'name', 'type', 'active']
const insertVehicles = `
INSERT OR IGNORE INTO vehicles ( _id, name, type, active) VALUES
${getInsertsFromRecords(vehicles, vehicleFields)};
`
console.log(insertVehicles)

const clubs = getRecordsFromFile('./tables/clubs.bson.json').map(vehicle => {
  const _id = vehicle._id.$oid
  return { ...vehicle, _id }
})
const clubFields = ['_id', 'name', 'active']
console.log(`
INSERT OR IGNORE INTO clubs ( _id, name, active) VALUES
${getInsertsFromRecords(clubs, clubFields)};
`)

const users = getRecordsFromFile('./tables/users.bson.json').map(user => {
  const _id = user._id.$oid
  const leader_for = user?.leader_for?.map(club => club.$oid)
  return { ...user, _id, leader_for }
})
const userFields = [
  '_id',
  'casID',
  'email',
  'password',
  'name',
  'photo_url',
  'pronoun',
  'dash_number',
  'allergies_dietary_restrictions',
  'medical_conditions',
  'clothe_size',
  'shoe_size',
  'height',
  'role',
  'has_pending_leader_change',
  'has_pending_cert_change',
  'driver_cert',
  'trailer_cert',
  'requested_clubs',
  'requested_certs'
]
console.log(`
INSERT OR IGNORE INTO USERS (
  _id,
  cas_id,
  email,
  password,
  name,
  photo_url,
  pronoun,
  dash_number,
  allergies_dietary_restrictions,
  medical_conditions,
  clothe_size,
  shoe_size,
  height,
  role,
  has_pending_leader_change,
  has_pending_cert_change,
  driver_cert,
  trailer_cert,
  requested_clubs,
  requested_certs
) VALUES
${getInsertsFromRecords(users, userFields)};
`)

const club_users = users
  .flatMap(user => user?.leader_for?.map(club => ({ user: user._id, club })))
  .filter(record => record)
  .filter(record => record.user && record.club)
console.log(`INSERT INTO club_leaders (user, club) VALUES
${getInsertsFromRecords(club_users, ['user', 'club'])}
`)

function getRecordsFromFile (fileName) {
  const contents = fs.readFileSync(fileName).toString()
  const records = contents
    .split('\n')
    .filter(item => item)
    .map(JSON.parse)
  return records
}

function getInsertsFromRecords (records, fields) {
  const recordFields = records.map(record => (
    fields.map(field => sqlize(record[field]))
  ))
  return recordFields.map(record => `(${record.join(',')})`).join(',\n')
}

function sqlize (value) {
  if (value === undefined) {
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
