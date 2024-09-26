import crypto from 'node:crypto'

import * as sessions from '../services/sessions.js'
import * as constants from '../constants.js'

const service_url = `${constants.backendURL}/signin-cas`
const cas_url = 'https://login.dartmouth.edu/cas'

/**
 * Require authentication for a route.
 *
 * This function is pretty overloaded right now, as it's doing the hard work of both being its own
 * middleware and imperfectly being the "get user" step of the other middlewares. I need to split
 * them up, but it requires some thought to do because there are key parts of the logic that you
 * don't want to duplicate.
 */
export function requireAuth(req, res, next) {
  const cookies = req.get('cookie')?.split('; ')

  if (!cookies) {
    console.warn('No cookies in request, sending user back to login page.')
    return denyLogin(req, res, next)
  }

  const cookieToken = cookies.find(item => item.substring(0, 5) === 'token')?.substring(6)
  const userId = sessions.getUserIdFromToken(cookieToken)
  // If there is a valid user session for that token, then add the user to request and move on
  if (userId) {
    req.user = userId
    // This gets automatically included as a variable for all the templates
    const userInfo = req.db.get(`
      SELECT is_opo, is_profile_complete FROM users WHERE id = ?
    `, userId)

    if (!userInfo) {
      sessions.invalidateToken(cookieToken)
      return denyLogin(req, res, next)
    }
    if (!userInfo.is_profile_complete && !req.url.includes('/new-user')) {
      return res.redirect(303, '/new-user')
    }

    res.locals.is_opo = userInfo.is_opo === 1
    return next()
  }

  // Otherwise, invalidate the token we received (redundant, but clean) and deny login
  sessions.invalidateToken(cookieToken)
  return denyLogin(req, res, next)
}

/** Allow the request if the user is a leader of ANY club, or an OPO staffer */
export function requireAnyLeader(req, res, next) {
  return requireAuth(req, res, () => {
    if (res.locals.is_opo === true) return next()
    const isLeader = req.db.get(`
      SELECT 1 as is_leader FROM club_leaders WHERE user = ? and is_approved = TRUE`,
    req.user)?.is_leader === 1

    if (isLeader) return next()
    return res.sendStatus(403)
  })
}

/** Allow the request if the user is a leader the specific trip, or an OPO staffer */
export function requireTripLeader(req, res, next) {
  return requireAuth(req, res, () => {
    const tripId = req.params.tripId
    if (!tripId) throw new Error('Trip Leader authorization used on a route without a trip.')

    const isLeader = req.db.get(`
      SELECT 1 as is_leader
      FROM trip_members WHERE user = ? AND trip = ? AND leader = 1
    `, req.user, tripId)?.is_leader === 1

    // Set a variable that says the current use is a leader for THIS trip
    if (isLeader) res.locals.is_leader_for_trip = true

    if (res.locals.is_opo === true || isLeader) return next()

    return res.sendStatus(403)
  })
}

/** Allow the request if the user is an OPO staffer */
export function requireOpo(req, res, next) {
  return requireAuth(req, res, () => {
    if (res.locals.is_opo === true) return next()
    return res.sendStatus(403)
  })
}

export async function signinCAS(req, res) {
  const ticket = req.query.ticket
  if (!ticket) return res.sendStatus(400)

  // Validate the ticket that is provided with the CAS server to verify that it's valid
  const params = new URLSearchParams({ service: service_url, ticket })
  const validationUri = cas_url + '/validate?' + params

  const validationRes = await fetch(validationUri)
  const validationText = await validationRes.text()
  const validaton = validationText.split('\n')

  // If the server sent back anything besides 'yes' in the first line, it's invalid
  if (validaton.at(0) !== 'yes') {
    console.error('CAS validation failed', validationText)
    return res.sendStatus(500)
  }

  // The second line is the casId
  const casId = validaton.at(1)
  if (!casId) {
    console.error('CAS validated but returned empty casId', validationText)
    return res.sendStatus(502)
  }

  let userId = req.db.getUserByCasId(casId)?.id
  if (!userId) {
    userId = req.db.insertUser(casId)
    console.log(`Created new user ${userId} for casId ${casId}`)
  }

  const token = await generateAndInsertNewToken(userId)
  console.log(`Signed in user ${userId} for casId ${casId}`)
  res.cookie('token', token, { secure: true, sameSite: 'Lax', httpOnly: true })
  return res.redirect('/')
}

export function logout(req, res) {
  sessions.invalidateUserToken(req.user)
  console.log(`Invalidate token for ${req.user}`)
  return sendToLogin(req, res)
}

async function generateAndInsertNewToken(userId) {
  const token = await getRandomKey()
  sessions.insertOrReplaceToken(userId, token)
  return token
}

async function getRandomKey() {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(256, (err, buf) => {
      if (err) reject(err)
      resolve(buf.toString('hex'))
    })
  })
}

function sendToLogin(_req, res, _next) {
  return res.redirect('/welcome')
}

function denyLogin(req, res, next) {
  if (req.method === 'GET') {
    return sendToLogin(req, res, next)
  } else {
    return res.sendStatus(401)
  }
}

/**
 * Log the user in as user #1.
 *
 * This function is intended only to be used when the application is in development mode. It sets
 * the browser to use the 'devtoken' cookie, and saves that cookie to log the user in as user #1.
 */
export function devLogin(_req, res) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('The dev login route was accessed, which should only be possible in dev mode.')
    return res.sendStatus(404)
  }
  sessions.setTokenUnsafe(1, 'devtoken')
  res.cookie('token', 'devtoken', { secure: true, sameSite: 'Lax' })
  return res.redirect('/')
}
