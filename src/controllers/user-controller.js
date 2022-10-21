import jwt from 'jwt-simple'
import { ObjectId } from 'mongodb'

import passport from '../services/passport.js'
import * as constants from '../constants.js'
import User from '../models/user-model.js'
import Trip from '../models/trip-model.js'
import VehicleRequest from '../models/vehicle-request-model.js'
import { Users } from '../services/mongo.js'
import * as utils from '../utils.js'

export const signinSimple = (req, res, next) => {
  passport.authenticate('local', async (err, user) => {
    if (err) { return err }
    if (!user) {
      console.log('No user found, rejecting')
      return res.status(500).send('rejected')
    }
    try {
      const foundUser = await Users.findOne({ _id: user._id })
      res.json({ token: tokenForUser(user._id, 'normal'), user: foundUser })
    } catch (error) {
      res.status(500).send(error.message)
    }
  })(req, res, next)
}

export const signinCAS = (req, res, next) => {
  passport.authenticate('cas', async (error, casID) => {
    if (error) { return error }
    if (!casID) { return res.redirect(constants.frontendURL) }

    try {
      const user = await Users.findOne({ casID })

      if (!user) {
        const newUser = { casID, completedProfile: false }
        const { insertedId } = await Users.insertOne(newUser)
        console.log(`Created new user ${insertedId} for ${casID}`)
        res.redirect(`${constants.frontendURL}?token=${tokenForUser(insertedId, 'normal')}&userId=${insertedId}&new?=yes`)
      } else {
        if (!user.isActive) {
          console.log(`User ${casID} logged in but isn't active, marking them active.`)
          user.isActive = true
          // No need to wait for this to finish, just log em in
          Users.updateOne({ _id: casID }, { $set: { isActive: true } })
        }

        console.log(`Logging in user ${casID}`)
        res.redirect(`${constants.frontendURL}?token=${tokenForUser(user._id, 'normal')}&userId=${casID}`)
      }
    } catch (error) {
      res.status(500).send(error.message)
    }
  })(req, res, next)
}

// how to route to signup instead?
export const signup = (req, res) => {
  const { email } = req.body
  const { password } = req.body
  const { name } = req.body
  if (!email || !password || !name) {
    res.status(422).send('You must provide a name, email and password')
  }
  User.findOne({ email }, (err, user) => {
    if (user) {
      res.status(422).send('User already exists')
    } else {
      const newUser = new User()
      newUser.email = email
      newUser.password = password
      newUser.name = name
      newUser.role = 'Trippee'
      newUser.leader_for = []
      newUser.save()
        .then((result) => {
          res.send({ token: tokenForUser(result.id, 'normal'), user: result })
        })
        .catch((error) => {
          res.status(500).send(error.message)
        })
      if (!email || !name) {
        res.status(422).send('You must provide a name, email and password')
      }
      User.findById(req.body.id, (err, user1) => {
        user1.email = email
        user1.name = name
        user1.role = 'Trippee'
        user1.leader_for = []
        user1.save()
          .then((result) => {
            res.send({ user: cleanUser(result) })
          })
          .catch((error) => {
            res.status(500).send(error.message)
          })
      })
    }
  })
}

export const roleAuthorization = (roles) => {
  return function authorize (req, res, next) {
    const { user } = req
    User.findById(user._id, (err, foundUser) => {
      if (err) {
        res.status(422).send('No user found.')
        return next(err)
      }
      if (roles.indexOf(foundUser.role) > -1) {
        return next()
      }
      res.status(401).send('You are not authorized to view this content')
      return next('Unauthorized')
    })
  }
}

export const myTrips = (req, res) => {
  const id = req.user._id
  Trip.find({ $or: [{ 'members.user': id }, { 'pending.user': id }, { leaders: id }] })
    .populate('club').populate('leaders').populate('vehicleRequest')
    .populate({
      path: 'members.user',
      model: 'User'
    })
    .populate({
      path: 'pending.user',
      model: 'User'
    })
    .populate({
      path: 'vehicleRequest',
      populate: {
        path: 'assignments',
        model: 'Assignment'
      }
    })
    .populate({
      path: 'vehicleRequest',
      populate: {
        path: 'assignments',
        populate: {
          path: 'assigned_vehicle',
          model: 'Vehicle'
        }
      }
    })
    .then((trips) => {
      VehicleRequest.find({ requester: id }).populate('associatedTrip')
        .then((vehicleRequests) => {
          res.json({ trips, vehicleRequests })
        })
    })
    .catch((error) => {
      res.status(500).send(error.message)
    })
}

const isInfoEmpty = (string) => {
  return !string || string.length === 0 || !string.toString().trim()
}

export const getUser = (req, res) => {
  User.findById(req.user._id).populate('leader_for').populate('requested_clubs').exec()
    .then((user) => {
      let hasCompleteProfile = true
      if (!user.email || !user.name || !user.pronoun || !user.dash_number || !user.allergies_dietary_restrictions ||
        !user.medical_conditions || !user.clothe_size || !user.shoe_size || !user.height ||
        isInfoEmpty(user.email) || isInfoEmpty(user.name) || isInfoEmpty(user.pronoun) || isInfoEmpty(user.dash_number) ||
        isInfoEmpty(user.allergies_dietary_restrictions) || isInfoEmpty(user.medical_conditions) ||
        isInfoEmpty(user.clothe_size) || isInfoEmpty(user.height)) {
        hasCompleteProfile = false
      }
      res.json({ user, hasCompleteProfile })
    })
    .catch((error) => {
      console.log(error)
      res.status(406).send(error.message)
    })
}

export async function getUserById (id) {
  return Users.findOne({ _id: ObjectId(id) })
}

export async function getUserByEmail (email) {
  return Users.findOne({ email })
}

export async function getLeaders (_req, res) {
  try {
    const leaders = await Users.find({ role: 'Leader' }).toArray()
    const leaderInfo = leaders.map(leader => utils.pick(leader, ['_id', 'name', 'email']))
    res.json(leaderInfo)
  } catch {
    res.error(500)
  }
}

/**
 * Returns all users in the database.
 * TODO: Make some users inactive.
 */
export async function getUsers (_req, res) {
  try {
    const users = await Users.find({}).toArray()
    const userInfo = users.map(leader => utils.pick(leader, ['_id', 'name', 'email']))
    res.json(userInfo)
  } catch (error) {
    res.error(500)
  }
}

export async function updateUser (req, res) {
  const userWithEmail = await Users.findOne({ email: req.body.email })
  if (userWithEmail && userWithEmail._id !== req.user._id) {
    throw new Error('This email is already associated with a different user')
  }

  if (!req.body.name) {
    throw new Error('You must have a name')
  }
  if (!req.body.email) {
    throw new Error('You must have an email')
  }

  const existingUser = Users.findOne({ _id: req.user._id })
  if (!existingUser.dash_number && !req.body.dash_number) {
    throw new Error('You must have a dash number')
  }

  const newUser = utils.pick(req.body,
    ['pronoun', 'dash_number', 'allergies_dietary_restrictions', 'medical_conditions', 'clothe_size', 'shoe_size', 'height', 'photo_url'])
  newUser.email = req.body.email
  newUser.name = req.body.name

  const newClubs = req.body.leader_for || []
  const currentClubs = existingUser.leader_for || []
  // Approval is required if user is adding a new club
  if (newClubs.length > currentClubs.length) {
    newUser.has_pending_leader_change = true
    newUser.requested_clubs = newClubs
    // If user is dropping a club, make sure that every club they're claiming is one they're currently a leader for
    // This is a little kludgy - a more granular API surface would not require this
  } else if (newClubs.every((club) => currentClubs.includes(club))) {
    newUser.leader_for = newClubs
    newUser.has_pending_leader_change = false
    newUser.requested_clubs = []
  }

  if (req.body.leader_for.length === 0 && existingUser.role !== 'OPO') {
    newUser.role = 'Trippee'
  }

  const hasNewTrailerCert = !existingUser.trailer_cert && req.body.trailer_cert
  const hasNewDriverCert = req.body.driver_cert !== null && existingUser.driver_cert !== req.body.driver_cert
  if (hasNewTrailerCert || hasNewDriverCert) {
    newUser.has_pending_cert_change = true
    const requestedCerts = {}
    requestedCerts.driver_cert = req.body.driver_cert
    requestedCerts.trailer_cert = req.body.trailer_cert
    newUser.requested_certs = requestedCerts
  } else {
    newUser.has_pending_cert_change = false
    newUser.requested_certs = {}
  }

  // These user changes can only be performed by OPO
  if (req.user.role === 'OPO') {
    if (!req.body.trailer_cert) {
      newUser.trailer_cert = req.body.trailer_cert
    }

    if (req.body.driver_cert === null) {
      newUser.driver_cert = req.body.driver_cert
    }

    if (req.body.role) {
      newUser.role = req.body.role
    }
  }

  try {
    await Users.updateOne({ _id: req.user._id }, { $set: newUser })
    getUser(req, res)
  } catch (error) {
    console.error(error)
    res.status(500).send('Something went wrong while saving your changes - contact OPO')
  }
}

export const userTrips = (req, res) => {
  Trip.find({}, (err, trips) => {
    const leaderOf = []
    const memberOf = []
    trips.forEach((trip) => {
      if (trip.leaders.indexOf(req.user._id) > -1) {
        leaderOf.push(trip)
      } else if (trip.members.indexOf(req.user._id) > -1) {
        memberOf.push(trip)
      }
    })
    res.json({ leaderOf, memberOf })
  })
}

export const getLeaderRequests = (req, res) => {
  User.find({ has_pending_leader_change: true }).populate('leader_for').populate('requested_clubs').exec()
    .then((users) => {
      return res.json(users)
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.message)
    })
}

export const respondToLeaderRequest = (req, res) => {
  User.findById(req.body.userId).populate('leader_for').populate('requested_clubs').exec()
    .then((user) => {
      if (req.body.status === 'approved') {
        if (user.role !== 'OPO') {
          user.role = 'Leader'
        }
        user.leader_for = user.requested_clubs
        user.requested_clubs = []
        user.has_pending_leader_change = false
        user.save()
          .then(() => {
            getLeaderRequests(req, res)
          })
      } else {
        user.has_pending_leader_change = false
        user.requested_clubs = []
        user.save()
          .then(() => {
            getLeaderRequests(req, res)
          })
      }
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.message)
    })
}

export const getCertRequests = (req, res) => {
  User.find({ has_pending_cert_change: true }).populate('leader_for').populate('requested_clubs').exec()
    .then((users) => {
      return res.json(users)
    })
}

export const respondToCertRequest = (req, res) => {
  User.findById(req.body.userId).populate('leader_for').populate('requested_clubs').exec()
    .then((user) => {
      if (req.body.status === 'approved') {
        user.driver_cert = user.requested_certs.driver_cert
        user.trailer_cert = user.requested_certs.trailer_cert
        user.requested_certs = {}
        user.has_pending_cert_change = false
        user.save()
          .then(() => {
            getCertRequests(req, res)
          })
      } else {
        user.has_pending_cert_change = false
        user.requested_certs = {}
        user.save()
          .then(() => {
            getCertRequests(req, res)
          })
      }
    })
    .catch((error) => {
      console.log(error)
      res.status(500).send(error.message)
    })
}

export function tokenForUser (userId, purpose, tripID) {
  const timestamp = new Date().getTime()
  return jwt.encode({
    sub: userId, iat: timestamp, purpose, tripID
  }, process.env.AUTH_SECRET)
}

function cleanUser (user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    pronoun: user.pronoun,
    role: user.role,
    leader_for: user.leader_for,
    dash_number: user.dash_number,
    allergies_dietary_restrictions: user.allergies_dietary_restrictions,
    medical_conditions: user.medical_conditions,
    clothe_size: user.clothe_size,
    height: user.height,
    has_pending_leader_change: user.has_pending_change,
    has_pending_cert_change: user.has_pending_cert_change,
    driver_cert: user.driver_cert,
    trailer_cert: user.trailer_cert
  }
}
