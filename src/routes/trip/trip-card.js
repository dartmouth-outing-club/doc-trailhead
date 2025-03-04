import * as utils from '../../utils.js'
import * as gear from './gear/gear.js'
import { getVehicleRequestData } from '../vehicle-request.js'

const _48_HOURS_IN_MS = 172800000

function getLeaderData(req, tripId, userId) {
  const user = req.db.get('SELECT is_opo FROM users WHERE id = ?', userId)

  const trip = req.db.get(`
    SELECT
      trips.id as trip_id,
      title,
      coalesce(clubs.name, 'None') as club,
      owner,
      start_time,
      end_time,
      pickup,
      description,
      plan,
      left,
      returned,
      dropoff,
      location,
      private,
      users.name as owner_name,
      iif(experience_needed = 0, 'No', 'Yes') as experience_needed,
      cost,
      vehiclerequests.id as vehiclerequest_id,
      vehiclerequests.is_approved as vehiclerequest_is_approved,
      vehiclerequests.request_details as vehiclerequest_details,
      member_gear_approved,
      group_gear_approved
    FROM trips
    LEFT JOIN clubs ON clubs.id = trips.club
    LEFT JOIN users ON users.id = trips.owner
    LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
    WHERE trips.id = ?
  `, tripId)

  const leaderNames = req.db.get(`
  SELECT group_concat(name, ', ') as names
  FROM trip_members
  LEFT JOIN users ON users.id = user
  WHERE leader = 1 AND trip = ?
  `, tripId).names

  const members = req.db.all(`
  SELECT
    users.id,
    email,
    name,
    leader,
    pending,
    signed_up_on,
    iif(trips.start_time < unixepoch() * 1000,
        '-',
        iif(attended = 0, 'No', 'Yes')) as attended,
    allergies_dietary_restrictions,
    medical_conditions,
    iif(users.id = trips.owner, 1, 0) as is_owner
  FROM trip_members
  LEFT JOIN trips ON trips.id = trip_members.trip
  LEFT JOIN users ON users.id = trip_members.user
  WHERE trip = ?
  ORDER BY is_owner DESC, trip_members.leader DESC, trip_members.rowid
  `, tripId).map(member => ({
    ...member,
    time_element: utils.getDatetimeElement(member.signed_up_on)
  }))

  // Display order for members is leaders first, followed by signup order

  const membersWithGear = members.map(member => {
    const requested_gear = req.db.all(`
    SELECT name
    FROM member_gear_requests AS mgr
    LEFT JOIN trip_required_gear AS trg ON trg.id = mgr.gear
    WHERE mgr.trip = ? AND mgr.user = ?
    `, tripId, member.id)
    return { ...member, requested_gear }
  })

  const memberRequestedGear = gear.getIndividualRequestedGear(req.db, tripId)
  const groupGearRequests = gear.getGroupRequestedGear(req.db, tripId)
  const requiredGear = req.db.all('SELECT id, name FROM trip_required_gear WHERE trip = ?', tripId)

  const tripPcardRequest = req.db.get(`
    SELECT
      assigned_pcard,
      num_people,
      is_approved,
      snacks as snacks_num,
      breakfast as breakfast_num,
      lunch as lunch_num,
      dinner as dinner_num,
      snacks * num_people * 3 as snack_cost,
      breakfast * num_people * 4 as breakfast_cost,
      lunch * num_people * 5 as lunch_cost,
      dinner * num_people * 6 as dinner_cost,
      num_people * ((snacks * 3) + (breakfast * 4) + (lunch * 5) + (dinner * 6)) AS food_total
    FROM trip_pcard_requests
    WHERE trip = ?
  `, tripId)
  const otherCosts = req.db.all('SELECT name, cost from pcard_request_costs WHERE trip = ?', tripId)
  const other_total = otherCosts.reduce((total, { cost }) => total + cost, 0)

  if (tripPcardRequest) {
    tripPcardRequest.other_costs = otherCosts
    tripPcardRequest.total = tripPcardRequest.food_total + other_total
  }

  trip.is_on_trip = req.db.isSignedUpForTrip(tripId, userId)
  trip.start_datetime = utils.getDatetimeValueForUnixTime(trip.start_time)
  trip.start_time_element = utils.getDatetimeElement(trip.start_time)
  trip.end_datetime = utils.getDatetimeValueForUnixTime(trip.end_time)
  trip.end_time_element = utils.getDatetimeElement(trip.end_time)
  trip.leader_names = leaderNames
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

  trip.attending = membersWithGear.filter(member => member.pending === 0)
  trip.pending = membersWithGear.filter(member => member.pending === 1)
  trip.attending_emails_list = trip.attending.map(user => user.email).join(';')
  trip.pending_emails_list = trip.pending.map(user => user.email).join(';')

  // Add vehicle request stuff
  if (trip.vehiclerequest_id) {
    const vehicleRequestData = getVehicleRequestData(req, trip.vehiclerequest_id)
    trip.available_vehicles = vehicleRequestData.available_vehicles
    trip.requested_vehicles = vehicleRequestData.requested_vehicles
    trip.vehiclerequest_is_approved = vehicleRequestData.vehiclerequest_is_approved
    trip.vehiclerequest_badge = vehicleRequestData.vehiclerequest_badge
  }

  // Enable status buttons if we're close enough to trip-start
  const now = (new Date()).getTime()
  if (trip.start_time < now + _48_HOURS_IN_MS) trip.check_out_enabled = true
  // Enable check-in if the trip has left; *disable* *check-out* if the trip has returned
  if (trip.left === 1) trip.check_in_enabled = true
  if (trip.returned === 1) trip.check_out_enabled = false

  const has_departed = utils.hasTimePassed(trip.start_time)
  const has_ownership = user.is_opo || trip.owner === userId
  trip.can_delete = has_ownership && !trip.returned && !has_departed

  // Show approval buttons if user is an OPO staffer and there is something to approve
  trip.show_member_gear_approval_buttons = user.is_opo && memberRequestedGear.length > 0
  trip.show_group_gear_approval_buttons = user.is_opo && groupGearRequests.length > 0
  trip.show_pcard_approval_buttons = user.is_opo && tripPcardRequest

  // TODO Refactor the badge method to make this less annoying
  if (trip.pcard_request) {
    trip.pcard_request.status = trip.pcard_request.is_approved === null
      ? utils.getBadgeImgElement('pending')
      : utils.getBadgeImgElement(trip.pcard_request.is_approved)
  }

  // True if all the status are approved or N/A, false otherwise
  const tripFinalStatus =
    (memberRequestedGear.length === 0 || trip.member_gear_approved === 1) &&
    (groupGearRequests || trip.group_gear_approved === 1) &&
    (!trip.pcard_request || trip.pcard_request.is_approved === 1) &&
    (!trip.vehiclerequest_id || trip.vehiclerequest_is_approved === 1)
  const badgeName = tripFinalStatus ? 'approved' : 'pending'
  trip.status_tag = utils.getStatusTag(trip.left, trip.returned, trip.late)
  trip.full_gear_status_badge = utils.getBadgeImgElement(badgeName)

  return trip
}

function getSignupData(req, tripId, userId) {
  const user = req.db.get('SELECT is_opo FROM users WHERE id = ?', userId)
  const trip = req.db.get(`
    SELECT
      trips.id as trip_id,
      title,
      coalesce(clubs.name, 'None') as club,
      start_time,
      end_time,
      pickup,
      description,
      dropoff,
      location,
      private,
      users.name as owner_name,
      iif(experience_needed = 0, 'No', 'Yes') as experience_needed,
      cost,
      member_gear_approved,
      group_gear_approved,
      iif(? = trips.owner, 1, 0) as is_owner
    FROM trips
    LEFT JOIN clubs ON clubs.id = trips.club
    LEFT JOIN users ON users.id = trips.owner
    LEFT JOIN vehiclerequests ON vehiclerequests.trip = trips.id
    WHERE trips.id = ?
  `, userId, tripId)

  const leaderNames = req.db.get(`
    SELECT group_concat(name, ', ') as names
    FROM trip_members
    LEFT JOIN users ON users.id = user
    WHERE leader = 1 AND trip = ?
  `, tripId).names

  const requiredGear = req.db.all(`
    SELECT id, name, iif(mgr.gear IS NULL, 0, 1) AS is_requested
    FROM trip_required_gear as trg
    LEFT JOIN (
      SELECT gear FROM member_gear_requests WHERE user = @user
    ) AS mgr ON mgr.gear = trg.id
    WHERE trip = @trip
  `, { trip: tripId, user: userId })

  trip.is_on_trip = req.db.isSignedUpForTrip(tripId, userId)
  trip.has_departed = utils.hasTimePassed(trip.start_time)
  trip.start_time = utils.getDatetimeElement(trip.start_time)
  trip.end_time = utils.getDatetimeElement(trip.end_time)
  trip.leader_names = leaderNames
  trip.required_gear = requiredGear

  // Show approval buttons if user is an OPO staffer and there is something to approve
  trip.is_opo = user.is_opo
  return trip
}

export function renderSignupCard(req, res, tripId, userId) {
  const trip = getSignupData(req, tripId, userId)
  return res.render('trip/signup-trip-card.njk', trip)
}

export function renderLeaderCard(req, res, tripId, userId) {
  const trip = getLeaderData(req, tripId, userId)
  return res.render('trip/leader-trip-card.njk', trip)
}

export function renderSignupPage(req, res, tripId, userId) {
  const trip = getSignupData(req, tripId, userId)
  return res.render('views/trip.njk', trip)
}

export function renderLeaderPage(req, res, tripId, userId) {
  const trip = getLeaderData(req, tripId, userId)
  return res.render('views/leader-trip.njk', trip)
}
