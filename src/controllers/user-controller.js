import jwt from 'jwt-simple'

import * as utils from '../utils.js'
import * as db from '../services/sqlite.js'

export function getListOfUsers (_req, res) {
  const users = db.getListOfUsers()
  return res.json(users)
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

export function myTrips (req, res) {
  const userId = req.user.id
  const trips = db.getUserTrips(userId)
  const vehicleRequests = db.getUserVehicleRequests(userId)

  return res.json({ trips, vehicleRequests })
}

export function getUser (req, res) {
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
    const userId = req.user.id
    const userWithEmail = db.getUserByEmail(req.body.email)
    if (userWithEmail && userWithEmail.id !== userId) {
      throw new Error('This email is already associated with a different user')
    }

    if (!req.body.name) {
      throw new Error('You must have a name')
    }
    if (!req.body.email) {
      throw new Error('You must have an email')
    }

    const existingUser = db.getUserById(userId)
    if (!existingUser.dash_number && !req.body.dash_number) {
      throw new Error('You must have a dash number')
    }

    const newUser = utils.pick(req.body,
      ['pronoun', 'dash_number', 'allergies_dietary_restrictions', 'medical_conditions', 'clothe_size', 'shoe_size', 'height', 'photo_url'])
    newUser.email = req.body.email
    newUser.name = req.body.name

    // The frontend sends us club objects, but the database stores club IDs
    // This is not a pattern that we will replicated with a new frontend
    const approvedClubs = existingUser.leader_for.map(club => club.id)
    const newClubs = req.body?.leader_for?.map(club => club.id) || []

    const newApprovedClubs = newClubs.filter(club => approvedClubs.includes(club))
    const newRequestedClubs = newClubs.filter(club => !approvedClubs.includes(club))
    db.replaceUsersClubs(userId, newApprovedClubs, newRequestedClubs)

    if (req.body.leader_for.length === 0 && existingUser.role !== 'OPO') {
      newUser.role = 'Trippee'
    }

    const hasNewTrailerCert = !existingUser.trailer_cert && req.body.trailer_cert
    const hasNewDriverCert = req.body.driver_cert !== null && existingUser.driver_cert !== req.body.driver_cert
    if (hasNewTrailerCert) {
      db.requestTrailerCert(userId)
    }
    if (hasNewDriverCert) {
      db.requestDriverCert(userId)
    }

    if (!hasNewTrailerCert && !hasNewDriverCert) {
      db.denyUserRequestedCerts(userId)
    }

    db.updateUser(newUser)
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
  const { userId } = req.body
  if (req.body.status !== 'approved') {
    db.denyLeadershipRequests(userId)
  } else {
    db.approveLeadershipRequests(userId)
  }

  return handleGetLeaderApprovals(req, res)
}

export async function handleGetCertApprovals (_req, res) {
  const usersWithPendingCerts = db.getUsersPendingCerts()
  return res.json(usersWithPendingCerts)
}

export async function handlePutCertApprovals (req, res) {
  const { userId } = req.body
  if (req.body.status !== 'approved') {
    db.denyUserRequestedCerts(userId)
  } else {
    db.approveUserRequestedCerts(userId)
  }

  return handleGetCertApprovals(req, res)
}

export function tokenForUser (userId, purpose, tripId) {
  const timestamp = new Date().getTime()
  if (!userId) throw new Error('Tried to encode a JWT but the userId was undefined')
  return jwt.encode({ sub: userId, iat: timestamp, purpose, tripId }, process.env.AUTH_SECRET)
}
