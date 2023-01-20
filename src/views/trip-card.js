import * as sqlite from '../services/sqlite.js'
import * as utils from '../utils.js'
import { getVehicleRequestData } from './vehicle-request.js'

function getLeaderData (tripId, userId) {
  const user = sqlite.get('SELECT is_opo FROM users WHERE id = ?', userId)
  const trip = sqlite.get(`
    SELECT
      trips.id as trip_id,
      title,
      clubs.name as club,
      owner,
      start_time,
      end_time,
      pickup,
      description,
      dropoff,
      location,
      users.name as owner_name,
      experience_needed,
      cost,
      vehiclerequests.id as vehiclerequest_id,
      vehiclerequests.is_approved as vehiclerequest_is_approved,
      member_gear_approved,
      group_gear_approved
    FROM trips
    LEFT JOIN clubs ON clubs.id = trips.club
    LEFT JOIN users ON users.id = trips.owner
    LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
    WHERE trips.id = ?
  `, tripId)

  const leaderNames = sqlite.get(`
  SELECT group_concat(name, ', ') as names
  FROM trip_members
  LEFT JOIN users ON users.id = user
  WHERE leader = 1 AND trip = ?
  `, tripId).names

  const members = sqlite.all(`
  SELECT
    users.id,
    name,
    leader,
    pending,
    iif(trips.start_time < unixepoch() * 1000,
        '-',
        iif(attended = 0, 'No', 'Yes')) as attended,
    allergies_dietary_restrictions,
    medical_conditions
  FROM trip_members
  LEFT JOIN trips ON trips.id = trip_members.trip
  LEFT JOIN users ON users.id = trip_members.user
  WHERE trip = ?
  ORDER BY trip_members.leader DESC, trip_members.rowid
  `, tripId) // Display order is leaders first, followed by signup order

  const membersWithGear = members.map(member => {
    const gearRequests = sqlite.all(`
    SELECT name
    FROM member_gear_requests
    LEFT JOIN trip_required_gear ON trip_required_gear.id = member_gear_requests.gear
    WHERE member_gear_requests.trip = ? AND user = ?
    `, tripId, member.id)
    const requested_gear = gearRequests.map(({ name }) => `<li>${name}`).join('\n')
    return { ...member, requested_gear }
  })

  const memberRequestedGear = sqlite.all(`
    SELECT name, count(gear) as quantity
    FROM member_gear_requests
    LEFT JOIN trip_required_gear ON trip_required_gear.id = member_gear_requests.gear
    WHERE member_gear_requests.trip = ?
    GROUP BY gear
    ORDER BY quantity DESC
  `, tripId)

  const requiredGear = sqlite.all('SELECT id, name FROM trip_required_gear WHERE trip = ?', tripId)

  const groupGearRequests = sqlite.all(`
    SELECT name, quantity FROM group_gear_requests WHERE trip = ? ORDER BY quantity DESC
  `, tripId)

  const tripPcardRequest = sqlite.get(`
    SELECT assigned_pcard, is_approved, snacks, breakfast, lunch, dinner, other_costs
    FROM trip_pcard_requests
    WHERE trip = ?
  `, tripId)

  trip.is_on_trip = sqlite.isSignedUpForTrip(tripId, userId)
  trip.start_datetime = utils.getDatetimeValueForUnixTime(trip.start_time)
  trip.start_time = utils.getLongTimeElement(trip.start_time)
  trip.end_datetime = utils.getDatetimeValueForUnixTime(trip.end_time)
  trip.end_time = utils.getLongTimeElement(trip.end_time)
  trip.trip_status = utils.getBadgeImgElement('approved') // TODO dynamically create
  trip.leader_names = leaderNames
  trip.attending = membersWithGear.filter(member => member.pending === 0)
  trip.pending = membersWithGear.filter(member => member.pending === 1)
  trip.required_gear = requiredGear
  trip.member_requested_gear = memberRequestedGear
  trip.group_gear = groupGearRequests
  trip.member_gear_status = memberRequestedGear.length > 0
    ? utils.getBadgeImgElement(trip.member_gear_approved !== null ? trip.member_gear_approved : 'pending')
    : '<span>-</span>'
  trip.group_gear_status = groupGearRequests.length > 0
    ? utils.getBadgeImgElement(trip.group_gear_approved !== null ? trip.group_gear_approved : 'pending')
    : '<span>-</span>'
  trip.pcard_request = tripPcardRequest

  // Add vehicle request stuff
  if (trip.vehiclerequest_id) {
    const vehicleRequestData = getVehicleRequestData(trip.vehiclerequest_id)
    trip.available_vehicles = vehicleRequestData.available_vehicles
    trip.requested_vehicles = vehicleRequestData.requested_vehicles
    trip.vehiclerequest_badge = vehicleRequestData.vehiclerequest_badge
  }

  // Show approval buttons if user is an OPO staffer and there is something to approve
  trip.is_opo = user.is_opo
  trip.can_delete = user.is_opo || trip.owner === userId
  trip.show_member_gear_approval_buttons = user.is_opo && memberRequestedGear.length > 0
  trip.show_group_gear_approval_buttons = user.is_opo && groupGearRequests.length > 0
  trip.show_pcard_approval_buttons = user.is_opo && tripPcardRequest

  // TODO Refactor the badge method to make this less annoying
  if (trip.pcard_request) {
    trip.pcard_request.status = trip.pcard_request.is_approved === null
      ? utils.getBadgeImgElement('pending')
      : utils.getBadgeImgElement(trip.pcard_request.is_approved)
  }

  return trip
}

function getSignupData (tripId, userId) {
  const user = sqlite.get('SELECT is_opo FROM users WHERE id = ?', userId)
  const trip = sqlite.get(`
    SELECT
      trips.id as trip_id,
      title,
      clubs.name as club,
      start_time,
      end_time,
      pickup,
      description,
      dropoff,
      location,
      users.name as owner_name,
      experience_needed,
      cost,
      member_gear_approved,
      group_gear_approved
    FROM trips
    LEFT JOIN clubs ON clubs.id = trips.club
    LEFT JOIN users ON users.id = trips.owner
    LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
    WHERE trips.id = ?
  `, tripId)

  const leaderNames = sqlite.get(`
    SELECT group_concat(name, ', ') as names
    FROM trip_members
    LEFT JOIN users ON users.id = user
    WHERE leader = 1 AND trip = ?
  `, tripId).names

  const requiredGear = sqlite.all(`
    SELECT id, name, iif(mgr.gear IS NULL, 0, 1) AS is_requested
    FROM trip_required_gear as trg
    LEFT JOIN (
      SELECT gear FROM member_gear_requests WHERE user = @user
    ) AS mgr ON mgr.gear = trg.id
    WHERE trip = @trip
  `, { trip: tripId, user: userId })

  trip.is_on_trip = sqlite.isSignedUpForTrip(tripId, userId)
  trip.start_time = utils.getLongTimeElement(trip.start_time)
  trip.end_time = utils.getLongTimeElement(trip.end_time)
  trip.trip_status = utils.getBadgeImgElement('approved') // TODO dynamically create
  trip.leader_names = leaderNames
  trip.required_gear = requiredGear

  // Show approval buttons if user is an OPO staffer and there is something to approve
  trip.is_opo = user.is_opo
  return trip
}

export function renderSignupCard (res, tripId, userId) {
  const trip = getSignupData(tripId, userId)
  return res.render('trip/signup-trip-card.njs', trip)
}

export function renderLeaderCard (res, tripId, userId) {
  const trip = getLeaderData(tripId, userId)
  return res.render('trip/leader-trip-card.njs', trip)
}

export function renderSignupPage (res, tripId, userId) {
  const trip = getSignupData(tripId, userId)
  return res.render('views/trip.njs', trip)
}

export function renderLeaderPage (res, tripId, userId) {
  const trip = getLeaderData(tripId, userId)
  return res.render('views/leader-trip.njs', trip)
}
