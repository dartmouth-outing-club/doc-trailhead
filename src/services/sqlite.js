import fs from 'node:fs'
import Database from 'better-sqlite3'
import { escapeProperties } from '../templates.js'

let db

export function start (name) {
  if (db !== undefined) throw new Error('ERROR: tried to start sqlite db that was already running')

  const dbName = name || ':memory:'
  try {
    db = new Database(dbName, { fileMustExist: true })
  } catch (err) {
    if (err.code === 'SQLITE_CANTOPEN') {
      console.error(err)
      throw new Error(`Failed to open db ${dbName}. Did you remember to initialize the database?`)
    }
  }
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  console.log(`Starting sqlite database from file: ${getDatabaseFile()}`)
}

export const getDatabaseFile = () => db.pragma('database_list')[0].file

export function stop () {
  db.close()
  db = undefined
}

export function execFile (filePath) {
  const statements = fs.readFileSync(filePath).toString()
  return db.exec(statements)
}

/**
 * REST functions
 */
export function get (query, ...params) {
  const result = db.prepare(query).get(...params)
  return escapeProperties(result)
}

export function all (query, ...params) {
  return db.prepare(query).all(...params).map(escapeProperties)
}

export function run (query, ...params) {
  return db.prepare(query).run(...params)
}

export function runMany (query, values) {
  const statement = db.prepare(query)
  values.forEach(parameters => {
    statement.run(...parameters)
  })
}

const _48_HOURS_IN_MS = 172800000
const _2_HOURS_IN_MS = 7200000
const _90_MINS_IN_MS = 5400000
const _3_HOURS_IN_MS = 10800000

export function getTripsPendingCheckOutEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _48_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE start_time > ? AND start_time < ? AND sent_emails NOT LIKE '%CHECK_OUT%'
  `).all(now.getTime(), emailWindow.getTime())
}

export function getTripsPendingCheckInEmail () {
  const now = new Date()
  const emailWindow = new Date(now.getTime() + _2_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time > ? AND end_time < ? AND sent_emails NOT LIKE '%CHECK_IN%'
  `).all(now.getTime(), emailWindow.getTime())
}

export function getTripsPending90MinEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _90_MINS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_90%'
  `).all(returnWindow.getTime())
}

export function getTripsPending3HourEmail () {
  const now = new Date()
  const returnWindow = new Date(now.getTime() - _3_HOURS_IN_MS)
  return db.prepare(`
  SELECT *
  FROM trips
  WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_180%'
  `).all(returnWindow.getTime())
}

export function markTripEmailSent (tripId, emailName) {
  try {
    return db.prepare(`
    UPDATE trips
    SET sent_emails = json_insert(sent_emails, '$[#]', ?)
    WHERE id = ?
  `).run(emailName, tripId)
  } catch (error) {
    console.error(`Error updating email status ${emailName} for trip ${tripId}:`, error)
  }
}

export const markCheckOutEmail = (tripId) => markTripEmailSent(tripId, 'CHECK_OUT')
export const markCheckInEmail = (tripId) => markTripEmailSent(tripId, 'CHECK_IN')
export const mark90MinEmail = (tripId) => markTripEmailSent(tripId, 'LATE_90')

export function markTripLate (tripId) {
  try {
    markTripEmailSent(tripId, 'LATE_180')
    return db.prepare('UPDATE trips SET marked_late = true WHERE id = ?').run(tripId)
  } catch (error) {
    console.error(`Error updating marking trip ${tripId} late:`, error)
  }
}

export function getUserById (id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id)
}

export function getUserByCasId (casId) {
  return db.prepare('SELECT * FROM users WHERE cas_id = ?').get(casId)
}

export function getUserByEmail (email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email)
}

export function getUserEmails (ids) {
  return ids.map(id => {
    const { email } = db.prepare('SELECT email FROM users WHERE id = ?').get(id)
    return email
  })
}

export function insertUser (casId) {
  const info = db.prepare('INSERT INTO users (cas_id) VALUES (?)').run(casId)
  return info.lastInsertRowid
}

export function isOpo (userId) {
  return get('SELECT is_opo FROM users WHERE id = ?', userId).is_opo === 1
}

export function isSignedUpForTrip (tripId, userId) {
  return get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ?',
    tripId, userId) !== undefined
}

export function isLeaderForTrip (tripId, userId) {
  return get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ? AND leader = TRUE',
    tripId, userId) !== undefined
}

export function getTripLeaderIds (tripId) {
  return db.prepare(`
  SELECT user
  FROM users
  LEFT JOIN trip_members ON user = users.id
  WHERE leader = true AND trip = ?
  `).all(tripId)
    .map(user => user.user)
}

export function getTripLeaderEmails (tripId) {
  return db.prepare(`
  SELECT email
  FROM users
  LEFT JOIN trip_members ON user = users.id
  WHERE leader = true AND trip = ?
  `).all(tripId)
    .map(user => user.email)
}
