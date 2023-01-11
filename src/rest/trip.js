import * as sqlite from '../services/sqlite.js'
import * as tripCard from './trip-card.js'

export function get (req, res) {
  const tripId = req.params.id

  // No point in showing trip leaders the "regular" view of their trip
  if (sqlite.isLeaderForTrip(tripId, req.user)) return res.redirect(`/leader/trip/${tripId}`)

  const trip = tripCard.getTripCardData(tripId, req.user)
  return res.render('trip.njs', trip)
}

export function getLeaderView (req, res) {
  const tripId = req.params.id

  // Leader view is available only if the user is the leader of that trip or on OPO
  const is_opo = sqlite.isOpo(req.user)
  const is_leader = sqlite.isLeaderForTrip(tripId, req.user)

  const trip = tripCard.getTripCardData(tripId, req.user)
  return is_opo || is_leader
    ? res.render('trip.njs', { ...trip, leader: true })
    : res.sendStatus(403)
}

// TODO refactor this with universal validation but individual handlers
function updateTripMembers (req, res, field, value) {
  const { tripId, userId } = req.params
  if (!tripId || !userId) {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite
    .run(`UPDATE trip_members SET ${field} = ${value} WHERE trip = ? and user = ?`, tripId, userId)

  return tripCard.renderTripCard(res, tripId, req.user)
}

export const makeLeader = (req, res) => updateTripMembers(req, res, 'leader', 1)
export const demote = (req, res) => updateTripMembers(req, res, 'leader', 0)
export const admit = (req, res) => updateTripMembers(req, res, 'pending', 0)
export const sendToWaitlist = (req, res) => updateTripMembers(req, res, 'pending', 1)

export function reject (req, res) {
  const { tripId, userId } = req.params
  if (!tripId || !userId || typeof tripId !== 'number' || typeof userId !== 'number') {
    console.warn('Bad request detected', tripId, userId)
    return res.sendStatus(400)
  }

  sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?', tripId, userId)
  return tripCard.renderTripCard(res, tripId, req.user)
}

export function signup (req, res) {
  const tripId = req.params.tripId
  if (!tripId) return res.sendStatus(400)

  // TODO add gear requests and make it possible to edit them
  console.log(req.body)

  sqlite.run('INSERT INTO trip_members (trip, user, leader, pending) VALUES (?, ?, false, false)',
    tripId, req.user)

  return tripCard.renderSignupTripCard(res, tripId, req.user)
}

export function leave (req, res) {
  const tripId = req.params.tripId

  if (!tripId) return res.sendStatus(400)
  const { changes } = sqlite.run('DELETE FROM trip_members WHERE trip = ? and user = ?',
    tripId, req.user)
  if (changes === 0) console.warn(`Unnecessary delete requested for trip ${tripId}`)
  return tripCard.renderSignupTripCard(res, tripId, req.user)
}
