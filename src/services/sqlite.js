import fs from 'node:fs'
import Database from 'better-sqlite3'

const _30_DAYS_IN_MS = 2592000000

// Match all files with names like 3-migration-name.sql
const MIGRATION_REGEX = /[0-9]+-.*\.sql/

export default class TrailheadDatabaseConnection {
  #db

  constructor(fileName) {
    const dbName = fileName || ':memory:'
    try {
      this.#db = new Database(dbName, { fileMustExist: true })
    } catch (err) {
      if (err.code === 'SQLITE_CANTOPEN') {
        console.log(`Note: database ${dbName} does not exist; starting new one`)
        this.#db = new Database(dbName)
      } else {
        throw err
      }
    }

    this.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT NOT NULL,
        timestamp INTEGER DEFAULT CURRENT_TIMESTAMP
      );
    `)

    this.#db.pragma('journal_mode = WAL')
    this.#db.pragma('foreign_keys = ON')
    console.log(`Starting sqlite database from file: ${this.getDatabaseFile()}`)
  }

  getDatabaseFile() {
    return this.#db.pragma('database_list')[0].file
  }

  stop() {
    this.#db.close()
    this.#db = undefined
  }

  execFile(filePath) {
    const statements = fs.readFileSync(filePath).toString()
    return this.#db.exec(statements)
  }

  get(query, ...params) {
    return this.#db.prepare(query).get(...params)
  }

  all(query, ...params) {
    return this.#db.prepare(query).all(...params)
  }

  prepare(query) {
    return this.#db.prepare(query)
  }

  transaction(fn) {
    return this.#db.transaction(fn)
  }

  run(query, ...params) {
    return this.#db.prepare(query).run(...params)
  }

  runMany(query, values) {
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

  runMigrations(dirName) {
    const migrations = fs.readdirSync(dirName, { withFileTypes: true })
      .filter(item => !item.isDirectory() && MIGRATION_REGEX.test(item.name))
      .map(item => {
        // Get the leading number of the migration so that we know what order to run them in
        const num = parseInt(item.name.match('[0-9]+')?.at(0))
        const filepath = `${item.path}/${item.name}`
        // Check whether the migration has been applied before
        const isApplied = this.get(
          `SELECT EXISTS (SELECT filename FROM _migrations WHERE filename = ?) as is_applied`,
          item.name
        ).is_applied === 1

        return { num, filepath, isApplied, ...item }
      })
      .sort((a, b) => (a.num - b.num))

    const unappliedMigrations = migrations.filter(migration => !migration.isApplied)
    const appliedMigrationsCount = migrations.length - unappliedMigrations.length

    console.log(`Migrations that were previously applied: ${appliedMigrationsCount}`)
    console.log(`Migrations to apply: ${unappliedMigrations.length}`)

    // Run all the unapplied migrations together in a single transaction
    // If any of them fail, the database should stay in the same state
    this.transaction(() => {
      for (const migration of unappliedMigrations) {
        console.log(`Applying migration ${migration.name}`)
        this.execFile(migration.filepath)
        this.run('INSERT INTO _migrations (filename) VALUES (?)', migration.name)
      }
    })()
  }

  /** Trailhead specifc routes */

  getUserById(id) {
    return this.#db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  }

  getUserByNetId(netId) {
    return this.#db.prepare('SELECT * FROM users WHERE net_id = ?').get(netId)
  }

  getUserByCasId(casId) {
    return this.#db.prepare('SELECT * FROM users WHERE cas_id = ?').get(casId)
  }

  getUserByEmail(email) {
    return this.#db.prepare('SELECT * FROM users WHERE email = ?').get(email)
  }

  getUserEmails(ids) {
    return ids.map(id => {
      const { email } = this.#db.prepare('SELECT email FROM users WHERE id = ?').get(id)
      return email
    })
  }

  insertUser(netId, casId) {
    const info = this.#db.prepare('INSERT INTO users (net_id, cas_id) VALUES (?, ?)')
      .run(netId, casId)
    return info.lastInsertRowid
  }

  isOpo(userId) {
    return this.get('SELECT is_opo FROM users WHERE id = ?', userId).is_opo === 1
  }

  isSignedUpForTrip(tripId, userId) {
    return this.get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ?',
      tripId, userId) !== undefined
  }

  isLeaderForTrip(tripId, userId) {
    return this.get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ? AND leader = TRUE',
      tripId, userId) !== undefined
  }

  isOpoOrLeaderForTrip(tripId, userId) {
    return this.isOpo(userId) || this.isLeaderForTrip(tripId, userId)
  }

  getTripLeaderIds(tripId) {
    return this.#db.prepare(`
      SELECT user
      FROM users
      LEFT JOIN trip_members ON user = users.id
      WHERE leader = true AND trip = ?
  `).all(tripId)
      .map(user => user.user)
  }

  getTripOwnerEmail(tripId) {
    return this.get(
      'SELECT email FROM trips LEFT JOIN users ON trips.owner = users.id WHERE trips.id = ?',
      tripId).email
  }

  getTripLeaderEmails(tripId) {
    return this.all(`
    SELECT email
    FROM users
    LEFT JOIN trip_members ON user = users.id
    WHERE leader = true AND trip = ?
  `, tripId)
      .map(user => user.email)
  }

  getActiveVehicles() {
    return this.all('SELECT id, name FROM vehicles WHERE active = TRUE ORDER BY name')
  }

  getTripEmailInfo(tripId) {
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

  getEmailForVehicleRequest(vehicleRequestId) {
    const email = this.get(`
    SELECT email
    FROM vehiclerequests
    LEFT JOIN users ON users.id = vehiclerequests.requester
    WHERE vehiclerequests.id = ?
  `, vehicleRequestId)?.email

    return email
  }

  /**
   * Session Management
   */

  /**
   * Get the user associated with the token provided.
   * Returns the userId if the token is valid, undefined otherwise.
   * Tokens are invalid if they do not exist in the database, or are over 30 days old.
   */
  getUserIdFromToken(token) {
    const currentTimestamp = (new Date()).getTime()

    const result = this.getSessionByToken(token)
    if (!result) return undefined

    if (result.timestamp + _30_DAYS_IN_MS < currentTimestamp) {
      console.warn(`Token for user ${result.user} is expired, deleting it.`)
      invalidateToken(token)
      return undefined
    }

    return result.user
  }

  getSessionByToken(token) {
    return this.#db.prepare('SELECT user, timestamp FROM tokens WHERE token = ?').get(token)
  }

  insertOrReplaceToken(userId, token) {
    const timestamp = (new Date()).getTime()
    this.#db.prepare('INSERT OR REPLACE INTO tokens (user, token, timestamp) VALUES (?, ?, ?)')
      .run(userId, token, timestamp)
  }

  invalidateUserToken(userId) {
    this.#db.prepare('DELETE FROM tokens WHERE user = ?').run(userId)
  }

  invalidateToken(token) {
    this.#db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
  }

  /**
   * Set a specific token for a specific user.
   *
   * Designated unsafe because there is no reason that you should use this in the normal course of
   * operation. It is is intended only for the developer route.
   */
  setTokenUnsafe(userId, token) {
    this.#db.prepare('INSERT OR REPLACE INTO tokens (user, token) VALUES (? ,?)')
      .run(userId, token)
  }
}
