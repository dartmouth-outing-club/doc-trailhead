import fs from 'node:fs'
import Database from 'better-sqlite3'

let db

export function start (name) {
  if (db !== undefined) throw new Error('ERROR: tried to start sqlite db that was already running')

  const dbName = name || ':memory:'
  try {
    db = new Database(dbName, { fileMustExist: true })
  } catch (err) {
    if (err.code === 'SQLITE_CANTOPEN') {
      console.warn('Sessions database does not exist, starting new one.')
      db = new Database(dbName, { fileMustExist: false })
      execFile('db/sessions-db-schema.sql')
    }
  }

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  console.log('Started sessions database')
}

export function stop () {
  db.close()
  db = undefined
}

function execFile (filePath) {
  const statements = fs.readFileSync(filePath).toString()
  return db.exec(statements)
}

const _30_DAYS_IN_MS = 2592000000

/**
 * Get the user associated with the token provided.
 * Returns the userId if the token is valid, undefined otherwise.
 * Tokens are invalid if they do not exist in the database, or are over 30 days old.
 */
export function getUserIdFromToken (token) {
  const currentTimestamp = (new Date()).getTime()

  const result = getSessionByToken(token)
  if (!result) return undefined

  if (result.timestamp + _30_DAYS_IN_MS < currentTimestamp) {
    console.warn(`Token for user ${result.user} is expired, deleting it.`)
    invalidateToken(token)
    return undefined
  }

  return result.user
}

function getSessionByToken (token) {
  return db.prepare('SELECT user, timestamp FROM tokens WHERE token = ?').get(token)
}

export function insertOrReplaceToken (userId, token) {
  const timestamp = (new Date()).getTime()
  db.prepare('INSERT OR REPLACE INTO tokens (user, token, timestamp) VALUES (?, ?, ?)')
    .run(userId, token, timestamp)
}

export function invalidateUserToken (userId) {
  db.prepare('DELETE FROM tokens WHERE user = ?').run(userId)
}

export function invalidateToken (token) {
  db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
}

/**
 * Set a specific token for a specific user.
 *
 * Designated unsafe because there is no reason that you should use this in the normal course of
 * operation. It is is intended only for the developer route.
 */
export function setTokenUnsafe (userId, token) {
  db.prepare('INSERT OR REPLACE INTO tokens (user, token) VALUES (? ,?)')
    .run(userId, token)
}
