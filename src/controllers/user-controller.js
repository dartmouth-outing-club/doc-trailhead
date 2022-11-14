import jwt from 'jwt-simple'
import { ObjectId } from 'mongodb'

import Trip from '../models/trip-model.js'
import VehicleRequest from '../models/vehicle-request-model.js'
import * as Clubs from '../controllers/club-controller.js'
import { users } from '../services/mongo.js'
import * as utils from '../utils.js'

export async function getUserById (id) {
  const _id = typeof id === 'string' ? new ObjectId(id) : id
  return users.findOne({ _id })
}

export async function getUsersById (ids) {
  return users.find({ _id: { $in: ids } }).toArray()
}

export async function getUserByCasId (casID) {
  return users.findOne({ casID })
}

export async function getUserByEmail (email) {
  return users.findOne({ email })
}

export async function getUsersFromEmailList (emailList) {
  return users.find({ email: { $in: emailList } }).toArray()
}

export async function getUserEmails (userIds) {
  const leaders = await users.find({ _id: { $in: userIds } }).toArray()
  return leaders.map(leader => leader.email)
}

export async function createUser (newUser) {
  return users.insertOne(newUser)
}

export function roleAuthorization (roles) {
  return async (req, res, next) => {
    try {
      const user = await users.findOne({ _id: req.user._id })
      if (!user) throw new Error('User not found')

      if (roles.includes(user.role)) {
        return next()
      }

      throw new Error(`User ${user.email} with role ${user.role} is not authorized to make this request: ${req.originalUrl}`)
    } catch (error) {
      console.error(error)
      return res.status(401).send('You are not authorized to view this content')
    }
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

export async function getUser (req, res) {
  const user = await users.findOne({ _id: req.user._id })
  if (!user) return res.sendStatus(404)

  const clubsMap = await Clubs.getClubsMap()
  user.leader_for = user.leader_for?.map(clubId => clubsMap[clubId]) || []
  user.requested_clubs = user.requested_clubs?.map(clubId => clubsMap[clubId]) || []

  let hasCompleteProfile
  // Obviously these are redundant, but that will require a frontend change to fix
  if (user.email && user.name && user.pronoun && user.dash_number && user.allergies_dietary_restrictions && user.medical_conditions && user.clothe_size && user.shoe_size && user.height) {
    user.completedProfile = true
    hasCompleteProfile = true
  } else {
    user.completedProfile = false
    hasCompleteProfile = false
  }
  return res.json({ user, hasCompleteProfile })
}

export async function getLeaders (_req, res) {
  try {
    const leaders = await users.find({ role: 'Leader' }).toArray()
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
    const allUsers = await users.find({}).toArray()
    const userInfo = allUsers.map(leader => utils.pick(leader, ['_id', 'name', 'email']))
    res.json(userInfo)
  } catch (error) {
    res.error(500)
  }
}

export async function updateUser (req, res) {
  try {
    const userWithEmail = await users.findOne({ email: req.body.email })
    if (userWithEmail && userWithEmail._id.toString() !== req.user._id.toString()) {
      throw new Error('This email is already associated with a different user')
    }

    if (!req.body.name) {
      throw new Error('You must have a name')
    }
    if (!req.body.email) {
      throw new Error('You must have an email')
    }

    const existingUser = users.findOne({ _id: req.user._id })
    if (!existingUser.dash_number && !req.body.dash_number) {
      throw new Error('You must have a dash number')
    }

    const newUser = utils.pick(req.body,
      ['pronoun', 'dash_number', 'allergies_dietary_restrictions', 'medical_conditions', 'clothe_size', 'shoe_size', 'height', 'photo_url'])
    newUser.email = req.body.email
    newUser.name = req.body.name

    // The frontend sends us club objects, but the database stores club IDs
    // This is not a pattern that we will replicated with a new frontend
    const requestedLeaderFor = req.body.leader_for || []
    const newClubs = requestedLeaderFor.map(club => club._id)
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
    await users.updateOne({ _id: req.user._id }, { $set: newUser })
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

export async function getLeaderRequests (_req, res) {
  const usersWithLeaderRequests = await users.find({ has_pending_leader_change: true }).toArray()
  const clubsMap = await Clubs.getClubsMap()

  // Leader requests need to have a populated clubs object, and the user's name and ID
  const leaderRequests = usersWithLeaderRequests
    .map(user => utils.pick(user, ['_id', 'name', 'requested_clubs']))
    .map(user => ({
      ...user,
      requested_clubs: Clubs.enhanceClubList(user.requested_clubs, clubsMap)
    }))
  return res.json(leaderRequests)
}

export async function respondToLeaderRequest (req, res) {
  let newUser = {}
  const userId = new ObjectId(req.body.userId)
  if (req.body.status !== 'approved') {
    newUser = { has_pending_leader_change: false, requestedClubs: [] }
  } else {
    const user = await users.findOne({ _id: userId })
    newUser.role = user.role === 'OPO' ? 'OPO' : 'Leader'
    newUser.leader_for = user.requested_clubs
    newUser.requested_clubs = []
    newUser.has_pending_leader_change = false
  }

  await users.updateOne({ _id: userId }, { $set: newUser })
  return getLeaderRequests(req, res)
}

export async function getCertRequests (_req, res) {
  const usersWithPendingCerts = await users.find({ has_pending_cert_change: true }).toArray()
  const certRequests = usersWithPendingCerts.map(user => utils.pick(user, ['_id', 'name', 'requested_certs']))
  return res.json(certRequests)
}

export async function respondToCertRequest (req, res) {
  let newUser = {}
  const userId = new ObjectId(req.body.userId)
  if (req.body.status !== 'approved') {
    newUser = { has_pending_cert_change: false, requestedCerts: {} }
  } else {
    const user = await users.findOne({ _id: userId })
    newUser = {
      driver_cert: user.requested_certs.driver_cert,
      trailer_cert: user.requested_certs.trailer_cert,
      requested_certs: {},
      has_pending_cert_change: false
    }
  }

  await users.updateOne({ _id: userId }, { $set: newUser })
  return getCertRequests(req, res)
}

export function tokenForUser (userId, purpose, tripId) {
  const timestamp = new Date().getTime()
  if (!userId) throw new Error('Tried to encode a JWT but the userId was undefined')
  return jwt.encode({ sub: userId, iat: timestamp, purpose, tripId }, process.env.AUTH_SECRET)
}
