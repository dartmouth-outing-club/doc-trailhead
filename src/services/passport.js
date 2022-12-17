import LocalStrategy from 'passport-local'
import passport from 'passport'
import bcrypt from 'bcryptjs'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import cas from 'passport-cas'
import { add } from 'date-arithmetic'

import * as db from '../services/sqlite.js'
import * as constants from '../constants.js'
import * as Users from '../controllers/user-controller.js'
import * as Trips from '../controllers/trip-controller.js'

export function signinCAS (req, res, next) {
  passport.authenticate('cas', async (error, casId) => {
    if (error) { return error }
    if (!casId) { return res.redirect(constants.frontendURL) }

    const user = db.getUserByCasId(casId)
    if (!user) {
      const insertedId = db.insertUser(casId)
      console.log(`Created new user ${insertedId} for ${casId}`)
      res.redirect(`${constants.frontendURL}?token=${Users.tokenForUser(insertedId, 'normal')}&userId=${insertedId}&new?=yes`)
    } else {
      console.log(`Logging in user ${casId}`)
      res.redirect(`${constants.frontendURL}?token=${Users.tokenForUser(user._id, 'normal')}&userId=${casId}`)
    }
  })(req, res, next)
}

export function signinSimple (req, res, next) {
  passport.authenticate('local', async (err, user) => {
    if (err) { return err }
    if (!user) {
      console.log('No user found, rejecting')
      return res.sendStatus(401)
    }
    const foundUser = db.getUserById(user.id)
    res.json({ token: Users.tokenForUser(user.id, 'normal'), user: foundUser })
  })(req, res, next)
}

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.AUTH_SECRET
}

const jwtLogin = new JwtStrategy(jwtOptions, async (payload, done) => {
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
      if (today.getTime() <= add(trip.end_time, 24, 'hours').getTime()) {
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

const localOptions = { usernameField: 'email' }
const localLogin = new LocalStrategy(localOptions, async (email, password, done) => {
  try {
    const user = db.getUserByEmail(email)
    if (!user) throw new Error(`User with email ${email} not found`)

    const comparisonResult = await bcrypt.compare(password, user.password)
    if (comparisonResult === true) {
      console.log(`Comparison succeeded, logging in ${email}`)
      done(null, user)
    }
    throw new Error(`Password comparison failed for user ${email}`)
  } catch (err) {
    done(err)
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
passport.use(localLogin)

export const requireAuth = passport.authenticate('jwt', { session: false })
export const requireSignin = passport.authenticate('local', { session: false })
export const requireCAS = passport.authenticate('cas', { session: false })
export default passport
