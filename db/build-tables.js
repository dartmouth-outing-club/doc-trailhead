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

const club_users = users
  .flatMap(user => user?.leader_for?.map(club => ({ user: user._id.$oid, club: club.$oid })))
  .filter(record => record)
  .filter(record => record.user && record.club)
console.log(getInsertStatementFromRecords(club_users, ['user', 'club'], 'club_leaders'))

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
