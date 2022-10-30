import passport from 'passport'
import LocalStrategy from 'passport-local'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import cas from 'passport-cas'
import dotenv from 'dotenv'
import { add } from 'date-arithmetic'
import bcrypt from 'bcryptjs'

import * as constants from '../constants.js'
import * as Users from '../controllers/user-controller.js'
import Trip from '../models/trip-model.js'

dotenv.config({ silent: true })

const localOptions = { usernameField: 'email' }

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.AUTH_SECRET
}

const localLogin = new LocalStrategy(localOptions, async (email, password, done) => {
  try {
    const user = await Users.getUserByEmail(email)
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

const jwtLogin = new JwtStrategy(jwtOptions, async (payload, done) => {
  try {
    const user = await Users.getUserById(payload.sub)
    if (!user) {
      console.error(payload)
      throw new Error(`User not found for id ${payload.sub}`)
    }

    if (payload.purpose === 'mobile') {
      const trip = await Trip.findById(payload.tripId)
      if (!trip) {
        console.error(payload)
        throw new Error(`Trip not found for id ${payload.tripId}`)
      }

      const today = new Date()
      if (today.getTime() <= add(trip.endDateAndTime, 24, 'hours').getTime()) {
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
passport.use(localLogin)

export const requireAuth = passport.authenticate('jwt', { session: false })
export const requireSignin = passport.authenticate('local', { session: false })
export const requireCAS = passport.authenticate('cas', { session: false })
export default passport
