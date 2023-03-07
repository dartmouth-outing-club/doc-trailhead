import crypto from 'node:crypto'
import passport from 'passport'
import cas from 'passport-cas'

import * as sqlite from '../services/sqlite.js'
import * as sessions from '../services/sessions.js'
import * as constants from '../constants.js'

const SIGNUP_URLS = ['/new-user', '/profile']
/**
 * Require authentication for a route.
 *
 * This function is pretty overloaded right now, as it's doing the hard work of both being its own
 * middleware and imperfectly being the "get user" step of the other middlewares. I need to split
 * them up, but it requires some thought to do because there are key parts of the logic that you
 * don't want to duplicate.
 */
export function requireAuth (req, res, next) {
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
    const userInfo = sqlite.get(`
      SELECT is_opo, is_profile_complete FROM users WHERE id = ?
    `, userId)

    if (!userInfo) {
      sessions.invalidateToken(cookieToken)
      return denyLogin(req, res, next)
    }
    if (!userInfo.is_profile_complete && !SIGNUP_URLS.includes(req.url)) {
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
export function requireAnyLeader (req, res, next) {
  return requireAuth(req, res, () => {
    if (res.locals.is_opo === true) return next()
    const isLeader = sqlite.get(`
      SELECT 1 as is_leader FROM club_leaders WHERE user = ? and is_approved = TRUE`,
    req.user)?.is_leader === 1

    if (isLeader) return next()
    return res.sendStatus(403)
  })
}

/** Allow the request if the user is a leader the specific trip, or an OPO staffer */
export function requireTripLeader (req, res, next) {
  return requireAuth(req, res, () => {
    const tripId = req.params.tripId
    if (!tripId) throw new Error('Trip Leader authorization used on a route without a trip.')

    const isLeader = sqlite.get(`
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
export function requireOpo (req, res, next) {
  return requireAuth(req, res, () => {
    if (res.locals.is_opo === true) return next()
    return res.sendStatus(403)
  })
}

export function signinCAS (req, res, next) {
  passport.authenticate('cas', async (error, casId) => {
    if (error) { return error }
    if (!casId) { return res.redirect(constants.frontendURL) }

    let userId = sqlite.getUserByCasId(casId)?.id
    if (!userId) {
      userId = sqlite.insertUser(casId)
      console.log(`Created new user ${userId} for casId ${casId}`)
    }

    const token = await generateAndInsertNewToken(userId)
    console.log(`Signed in user ${userId} for casId ${casId}`)

    res.cookie('token', token, { secure: true, sameSite: 'Lax', httpOnly: true })
    return res.redirect('/')
  })(req, res, next)
}

export function logout (req, res) {
  sessions.invalidateUserToken(req.user)
  console.log(`Invalidate token for ${req.user}`)
  return sendToLogin(req, res)
}

async function generateAndInsertNewToken (userId) {
  const token = await getRandomKey()
  sessions.insertOrReplaceToken(userId, token)
  return token
}

async function getRandomKey () {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(256, (err, buf) => {
      if (err) reject(err)
      resolve(buf.toString('hex'))
    })
  })
}

function sendToLogin (_req, res, _next) {
  return res.redirect('/welcome')
}

function denyLogin (req, res, next) {
  if (req.method === 'GET') return sendToLogin(req, res, next)
  return res.sendStatus(401)
}

/**
 * Log the user in as user #1.
 *
 * This function is intended only to be used when the application is in development mode. It sets
 * the browser to use the 'devtoken' cookie, and saves that cookie to log the user in as user #1.
 */
export function devLogin (_req, res) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('The dev login route was accessed, which should only be possible in dev mode.')
    return res.sendStatus(404)
  }
  sessions.setTokenUnsafe(1, 'devtoken')
  res.cookie('token', 'devtoken', { secure: true, sameSite: 'Lax' })
  return res.redirect('/')
}

const casOptions = {
  ssoBaseURL: 'https://login.dartmouth.edu/cas',
  serverBaseURL: `${constants.backendURL}/signin-cas`
}

const casLogin = new cas.Strategy(casOptions, (user, done) => {
  return done(null, user)
})

passport.use(casLogin)
