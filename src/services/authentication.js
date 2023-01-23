import crypto from 'node:crypto'
import passport from 'passport'
import cas from 'passport-cas'

import * as sqlite from '../services/sqlite.js'
import * as sessions from '../services/sessions.js'
import * as constants from '../constants.js'

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

export function requireAuth (req, res, next) {
  const cookies = req.get('cookie')?.split(';')
  console.log(cookies)

  if (!cookies) {
    console.warn('No cookies in request, sending user back to login page.')
    return sendToLogin(req, res, next)
  }

  const cookieToken = cookies.find(item => item.substring(0, 5) === 'token')?.substring(6)
  const userId = sessions.getUserIdFromToken(cookieToken)
  // If there is a valid user session for that token, then add the user to request and move on
  if (userId) {
    req.user = userId
    // This gets automatically included as a variable for all the templates
    res.locals.is_opo = sqlite.get('SELECT is_opo FROM users WHERE id = ?', userId).is_opo === 1
    return next()
  }

  // Otherwise, invalidate the token we received (redundant, but clean) and redirect to login
  sessions.invalidateToken(cookieToken)
  return sendToLogin(req, res, next)
}

/** Allow the request if the user is a leader of ANY club, or an OPO staffer */
export function requireAnyLeader (req, res, next) {
  if (res.locals.is_opo === true) return next()
  const isLeader = sqlite.get(`
    SELECT 1 as is_leader
    FROM club_leaders WHERE user = ? and is_approved = TRUE`, req.user)?.is_leader === 1
  if (isLeader) return next()
  return res.sendStatus(403)
}

/** Allow the request if the user is a leader the specific trip, or an OPO staffer */
export function requireTripLeader (req, res, next) {
  const tripId = req.params.tripId
  if (!tripId) console.error('Trip Leader authorization used on a route without a trip. This is almost certainly an error.')

  const isLeader = sqlite.get(`
    SELECT 1 as is_leader
    FROM trip_members WHERE user = ? AND trip = ? AND leader = 1
    `, req.user, tripId)?.is_leader === 1

  // Set a variable that says the current use is a leader for THIS trip
  if (isLeader) res.locals.is_leader_for_trip = true

  // Return true if the user is OPO or a trip leader
  if (res.locals.is_opo === true || isLeader) return next()

  // Return 403 FORBIDDEN otherwise
  return res.sendStatus(403)
}

/** Allow the request if the user is an OPO staffer */
export function requireOpo (_req, res, next) {
  if (res.locals.is_opo === true) return next()
  if (typeof res.locals.is_opo !== 'boolean') {
    console.warn('OPO was required for a route, but that route has not been authenticated.')
  }
  return res.sendStatus(403)
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
    console.log(token)
    console.log(`Signed in user ${userId} for casId ${casId}`)

    res.cookie('token', token, { secure: true, sameSite: 'Lax' })
    return res.redirect('/')
  })(req, res, next)
}

export function logout (req, res) {
  sessions.invalidateUserToken(req.user)
  console.log(`Invalidate token for ${req.user}`)
  return sendToLogin(req, res)
}

const casOptions = {
  ssoBaseURL: 'https://login.dartmouth.edu/cas',
  serverBaseURL: `${constants.backendURL}/signin-cas`
}

const casLogin = new cas.Strategy(casOptions, (user, done) => {
  return done(null, user)
})

passport.use(casLogin)
