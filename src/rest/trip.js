import * as sqlite from '../services/sqlite.js'
import * as tripCard from './trip-card.js'

export function getSignupView (req, res) {
  const tripId = req.params.id
  // No point in showing trip leaders the "regular" view of their trip
  if (sqlite.isLeaderForTrip(tripId, req.user)) return res.redirect(`/leader/trip/${tripId}`)
  tripCard.renderSignupPage(res, tripId, req.user)
}

export function getLeaderView (req, res) {
  const tripId = req.params.id
  // Leader view is available only if the user is the leader of that trip or on OPO
  const is_opo = sqlite.isOpo(req.user)
  const is_leader = sqlite.isLeaderForTrip(tripId, req.user)
  return is_opo || is_leader
    ? tripCard.renderLeaderPage(res, tripId, req.user)
    : res.sendStatus(403)
}

export function createTrip (req, res) {
  let trip
  try {
    trip = {
      title: req.body.title,
      cost: req.body.cost,
      owner: req.user,
      coleader_can_edit: req.body.edit_access === 'on' ? 1 : 0,
      experience_needed: req.body.experience_needed === 'on' ? 1 : 0,
      private: req.body.is_private === 'on' ? 1 : 0,
      // Eventually, when JS gets better date handling, this should probably be replaced
      start_time: (new Date(req.body.start_time)).getTime(),
      end_time: (new Date(req.body.end_time)).getTime(),
      location: req.body.location,
      pickup: req.body.pickup,
      dropoff: req.body.dropoff,
      description: req.body.description
    }
  } catch {
    console.warn('Malformed request to create trip, unable to parse body')
    console.warn(req.body)
    return res.sendStatus(400)
  }

  console.log(trip)
  const { lastInsertRowid } = sqlite.run(`
    INSERT INTO trips (
      title, cost, owner, club, coleader_can_edit, experience_needed, private, start_time, end_time,
      location, pickup, dropoff, description)
    VALUES (
      @title, @cost, @owner, @club, @coleader_can_edit, @experience_needed, @private, @start_time,
      @end_time, @location, @pickup, @dropoff, @description
    )
  `, trip)
  sqlite.run('INSERT INTO ')

  res.redirect(`/trip/${lastInsertRowid}`)
}
