import passport from 'passport'
import { Strategy as JwtStrategy } from 'passport-jwt'
import cas from 'passport-cas'
import jwt from 'jwt-simple'
import { add } from 'date-arithmetic'

import * as db from '../services/sqlite.js'
import * as constants from '../constants.js'

export function tokenForUser (userId, purpose, tripId) {
  const timestamp = new Date().getTime()
  if (!userId) throw new Error('Tried to encode a JWT but the userId was undefined')
  return jwt.encode({ sub: userId, iat: timestamp, purpose, tripId }, process.env.AUTH_SECRET)
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

    console.log(`Signed in user ${userId} for casId ${casId}`)
    const token = tokenForUser(userId, 'normal')
    res.cookie('token', token)
    return res.redirect('/')
  })(req, res, next)
}

const jwtOptions = {
  secretOrKey: process.env.AUTH_SECRET,
  // Where to find the JWT token in the request
  jwtFromRequest: (req) => {
    const cookies = req.get('cookie').split(';')
    if (!cookies) {
      console.warn('No cookies in request')
      return undefined
    }
    const token = cookies.find(item => item.substring(0, 5) === 'token')?.substring(6)
    return token
  }
}

const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
  try {
    const user = db.getUserById(payload.sub)
    if (!user) {
      console.error(payload)
      throw new Error(`User not found for id ${payload.sub}`)
    }

    if (payload.purpose === 'mobile') {
      const trip = db.getTripById(payload.tripId)
      if (!trip) {
        console.error(payload)
        throw new Error(`Trip not found for id ${payload.tripId}`)
      }

      const today = new Date()
      if (today.getTime() <= add(trip.end_time, 30, 'days').getTime()) {
        console.log('Mobile token is valid')
        done(null, user)
      } else {
        throw new Error('Mobile token expired')
      }
    } else {
      done(null, user)
    }
  } catch (err) {
    done(err, false)
  }
})

const casOptions = {
  ssoBaseURL: 'https://login.dartmouth.edu/cas',
  serverBaseURL: `${constants.backendURL}/signin-cas`
}
const casLogin = new cas.Strategy(casOptions, (user, done) => {
  return done(null, user)
})

passport.use(casLogin)
passport.use(jwtLogin)

export const requireAuth = passport.authenticate('jwt', { session: false, failureRedirect: '/welcome.html' })
export const requireCAS = passport.authenticate('cas', { session: false })
