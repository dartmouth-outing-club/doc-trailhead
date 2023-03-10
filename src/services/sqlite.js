import fs from 'node:fs'
import Database from 'better-sqlite3'
import { escapeProperties } from '../templates.js'

const _48_HOURS_IN_MS = 172800000
const _2_HOURS_IN_MS = 7200000
const _90_MINS_IN_MS = 5400000
const _3_HOURS_IN_MS = 10800000

export default class TrailheadDatabaseConnection {
  #db

  constructor (fileName) {
    const dbName = fileName || ':memory:'
    try {
      this.#db = new Database(dbName, { fileMustExist: true })
    } catch (err) {
      if (err.code === 'SQLITE_CANTOPEN') {
        console.error(err)
        throw new Error(`Failed to open db ${dbName}. Did you remember to initialize the database?`)
      }
    }
    this.#db.pragma('journal_mode = WAL')
    this.#db.pragma('foreign_keys = ON')
    console.log(`Starting sqlite database from file: ${this.getDatabaseFile()}`)
  }

  getDatabaseFile () {
    return this.#db.pragma('database_list')[0].file
  }

  stop () {
    this.#db.close()
    this.#db = undefined
  }

  execFile (filePath) {
    const statements = fs.readFileSync(filePath).toString()
    return this.#db.exec(statements)
  }

  /**
   * REST functions
   */
  get (query, ...params) {
    const result = this.#db.prepare(query).get(...params)
    return escapeProperties(result)
  }

  all (query, ...params) {
    return this.#db.prepare(query).all(...params).map(escapeProperties)
  }

  /**
   * Wrap final middleware function in a database transaction.
   *
   * Note that because this calls the two-argument middleware (no next()) it can only be used as the
   * final function. This is useful! You shouldn't be doing database transactions in any other parts
   * of the chain.
   */
  withTransaction (func) {
    return (req, res) => {
      this.#db.transaction(() => func(req, res))()
    }
  }

  // Does not escape propertiers, ergo, do not use for HTML APIs
  allUnsafe (query, ...params) {
    return this.#db.prepare(query).all(...params)
  }

  run (query, ...params) {
    return this.#db.prepare(query).run(...params)
  }

  runMany (query, values) {
    const statement = this.#db.prepare(query)
    values.forEach(parameters => {
      // Spread an array if using ? parameters
      if (Array.isArray(parameters)) {
        statement.run(...parameters)
        // Otherwise use named parameters
      } else {
        statement.run(parameters)
      }
    })
  }

  getTripsPendingCheckOutEmail () {
    const now = new Date()
    const emailWindow = new Date(now.getTime() + _48_HOURS_IN_MS)
    const trips = this.#db.prepare(`
      SELECT *
      FROM trips
      WHERE start_time > ? AND start_time < ? AND sent_emails NOT LIKE '%CHECK_OUT%'
  `).all(now.getTime(), emailWindow.getTime())
    trips.forEach(trip => { trip.leaderEmails = this.getTripLeaderEmails(trip.id) })
    return trips
  }

  getTripsPendingCheckInEmail () {
    const now = new Date()
    const emailWindow = new Date(now.getTime() + _2_HOURS_IN_MS)
    const trips = this.#db.prepare(`
      SELECT *
      FROM trips
      WHERE end_time > ? AND end_time < ? AND sent_emails NOT LIKE '%CHECK_IN%'
  `).all(now.getTime(), emailWindow.getTime())
    trips.forEach(trip => { trip.leaderEmails = this.getTripLeaderEmails(trip.id) })
    return trips
  }

  getTripsPending90MinEmail () {
    const now = new Date()
    const returnWindow = new Date(now.getTime() - _90_MINS_IN_MS)
    const trips = this.#db.prepare(`
      SELECT *
      FROM trips
      WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_90%'
  `).all(returnWindow.getTime())
    trips.forEach(trip => { trip.leaderEmails = this.getTripLeaderEmails(trip.id) })
    return trips
  }

  getTripsPending3HourEmail () {
    const now = new Date()
    const returnWindow = new Date(now.getTime() - _3_HOURS_IN_MS)
    const trips = this.#db.prepare(`
      SELECT *
      FROM trips
      WHERE end_time < ? AND returned = false AND sent_emails NOT LIKE '%LATE_180%'
  `).all(returnWindow.getTime())
    trips.forEach(trip => { trip.leaderEmails = this.getTripLeaderEmails(trip.id) })
    return trips
  }

  markTripEmailSent (tripId, emailName) {
    try {
      return this.#db.prepare(`
        UPDATE trips
        SET sent_emails = json_insert(sent_emails, '$[#]', ?)
        WHERE id = ?
  `).run(emailName, tripId)
    } catch (error) {
      console.error(`Error updating email status ${emailName} for trip ${tripId}:`, error)
    }
  }

  markCheckOutEmail = (tripId) => this.markTripEmailSent(tripId, 'CHECK_OUT')
  markCheckInEmail = (tripId) => this.markTripEmailSent(tripId, 'CHECK_IN')
  mark90MinEmail = (tripId) => this.markTripEmailSent(tripId, 'LATE_90')

  markTripLate (tripId) {
    try {
      this.markTripEmailSent(tripId, 'LATE_180')
      return this.#db.prepare('UPDATE trips SET marked_late = true WHERE id = ?').run(tripId)
    } catch (error) {
      console.error(`Error updating marking trip ${tripId} late:`, error)
    }
  }

  getUserById (id) {
    return this.#db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  }

  getUserByCasId (casId) {
    return this.#db.prepare('SELECT * FROM users WHERE cas_id = ?').get(casId)
  }

  getUserByEmail (email) {
    return this.#db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  }

  getUserEmails (ids) {
    return ids.map(id => {
      const { email } = this.#db.prepare('SELECT email FROM users WHERE id = ?').get(id)
      return email
    })
  }

  insertUser (casId) {
    const info = this.#db.prepare('INSERT INTO users (cas_id) VALUES (?)').run(casId)
    return info.lastInsertRowid
  }

  isOpo (userId) {
    return this.get('SELECT is_opo FROM users WHERE id = ?', userId).is_opo === 1
  }

  isSignedUpForTrip (tripId, userId) {
    return this.get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ?',
      tripId, userId) !== undefined
  }

  isLeaderForTrip (tripId, userId) {
    return this.get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ? AND leader = TRUE',
      tripId, userId) !== undefined
  }

  isOpoOrLeaderForTrip (tripId, userId) {
    return this.isOpo(userId) || this.isLeaderForTrip(tripId, userId)
  }

  getTripLeaderIds (tripId) {
    return this.#db.prepare(`
      SELECT user
      FROM users
      LEFT JOIN trip_members ON user = users.id
      WHERE leader = true AND trip = ?
  `).all(tripId)
      .map(user => user.user)
  }

  getTripOwnerEmail (tripId) {
    return this.get(
      'SELECT email FROM trips LEFT JOIN users ON trips.owner = users.id WHERE trips.id = ?',
      tripId).email
  }

  getTripLeaderEmails (tripId) {
    return this.all(`
    SELECT email
    FROM users
    LEFT JOIN trip_members ON user = users.id
    WHERE leader = true AND trip = ?
  `, tripId)
      .map(user => user.email)
  }

  getActiveVehicles () {
    return this.all('SELECT id, name FROM vehicles WHERE active = TRUE ORDER BY name')
  }

  getTripEmailInfo (tripId) {
    const trip = this.get(`
    SELECT trips.id, title, users.email as owner_email
    FROM trips
    LEFT JOIN users ON owner = users.id
    WHERE trips.id = ?`, tripId)
    trip.member_emails = this.all(`
    SELECT email
    FROM trip_members
    LEFT JOIN users ON trip_members.user = users.id
    WHERE trip_members.trip = ?
  `, tripId).map(item => item.email)

    return trip
  }

  getEmailForVehicleRequest (vehicleRequestId) {
    const email = this.get(`
    SELECT email
    FROM vehiclerequests
    LEFT JOIN users ON users.id = vehiclerequests.requester
    WHERE vehiclerequests.id = ?
  `, vehicleRequestId)?.email

    return email
  }
}
