import jwt from 'jwt-simple'
import { ObjectId } from 'mongodb'

import * as Clubs from '../controllers/club-controller.js'
import { users } from '../services/mongo.js'
import * as utils from '../utils.js'
import * as db from '../services/sqlite.js'

export function getUserById (id) {
  return db.getUserById(id)
}

export function getUserByCasId (casID) {
  return db.getUserByCasId(casID)
}

export function getUserByEmail (email) {
  return db.getUserByEmail(email)
}

export async function getUsersFromEmailList (emailList) {
  return users.find({ email: { $in: emailList } }).toArray()
}

export function getListOfUsers (_req, res) {
  const users = db.getListOfUsers()
  return res.json(users)
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
      const user = db.getUserById(req.user.id)
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

export async function myTrips (req, res) {
  const userId = req.user.id
  const trips = db.getUserTrips(userId)
  const vehicleRequests = db.getUserVehicleRequests(userId)

  return res.json({ trips, vehicleRequests })
}

export async function getUser (req, res) {
  const user = db.getUserById(req.user.id)
  if (!user) return res.sendStatus(404)

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

export async function handleGetLeaderApprovals (_req, res) {
  const usersWithLeaderRequests = db.getLeadersPendingApproval()
  return res.json(usersWithLeaderRequests)
}

export async function handlePutLeaderApprovals (req, res) {
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
  return handleGetLeaderApprovals(req, res)
}

export async function handleGetCertApprovals (_req, res) {
  const usersWithPendingCerts = await users.find({ has_pending_cert_change: true }).toArray()
  const certRequests = usersWithPendingCerts.map(user => utils.pick(user, ['_id', 'name', 'requested_certs']))
  return res.json(certRequests)
}

export async function handlePutCertApprovals (req, res) {
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
  return handleGetCertApprovals(req, res)
}

export function tokenForUser (userId, purpose, tripId) {
  const timestamp = new Date().getTime()
  if (!userId) throw new Error('Tried to encode a JWT but the userId was undefined')
  return jwt.encode({ sub: userId, iat: timestamp, purpose, tripId }, process.env.AUTH_SECRET)
}
