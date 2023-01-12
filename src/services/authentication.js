import crypto from 'node:crypto'
import passport from 'passport'
import cas from 'passport-cas'
import jwt from 'jwt-simple'

import * as db from '../services/sqlite.js'
import * as sessions from '../services/sessions.js'
import * as constants from '../constants.js'

export async function tokenForUser (userId, purpose, tripId) {
  const timestamp = new Date().getTime()
  if (!userId) throw new Error('Tried to encode a JWT but the userId was undefined')
  return jwt.encode({ sub: userId, iat: timestamp, purpose, tripId }, process.env.AUTH_SECRET)
}

async function generateAndInsertNewToken (userId) {
  const token = await getKey()
  sessions.insertOrReplaceToken(userId, token)
  return token
}

async function getKey () {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(256, (err, buf) => {
      if (err) reject(err)
      resolve(buf.toString('hex'))
    })
  })
}

function sendToLogin (_req, res, _next) {
  // res.set('HX-Redirect', '/welcome.html')
  return res.redirect('/welcome.html')
}

export function requireAuth (req, res, next) {
  const cookies = req.get('cookie').split(';')

  if (!cookies) {
    console.warn('No cookies in request')
    return sendToLogin(req, res, next)
  }

  const cookieToken = cookies.find(item => item.substring(0, 5) === 'token')?.substring(6)
  const userId = sessions.getUserIdFromToken(cookieToken)
  // If there is a valid user session for that token, then add the user to request and move on
  if (userId) {
    req.user = userId
    return next()
  }

  // Otherwise, invalidate the token we received (redundant, but clean) and redirect to login
  sessions.invalidateToken(cookieToken)
  return sendToLogin(req, res, next)
}

export function signinCAS (req, res, next) {
  passport.authenticate('cas', async (error, casId) => {
    if (error) { return error }
    if (!casId) { return res.redirect(constants.frontendURL) }

    let userId = db.getUserByCasId(casId)?.id
    if (!userId) {
      userId = db.insertUser(casId)
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