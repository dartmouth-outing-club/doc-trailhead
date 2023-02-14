/**
 * All the REST functions for the application.
 *
 * This file contains all the actions that can be performed upon the application. Every one of these
 * actions require the user to be signed in, so the router itself is secured behind an
 * authorization function. Addition authorization functions (which assume that the user is at least
 * authenticated) are added where appropriate. For instance, some of these routes edit trips,
 * and they should only be * available to a leader of the partiuclar trip being edited (or an OPO
 * staffer). Those routes have a "requiredTripLeader" authorization scheme.
 */
import { Router } from 'express'

import { requireAnyLeader, requireTripLeader, requireOpo } from './services/authentication.js'
import * as allTrips from './rest/all-trips.js'
import * as profile from './rest/profile.js'
import * as trip from './rest/trip.js'
import * as tripMembers from './rest/trip-members.js'
import * as tripRequests from './rest/trip-requests.js'
import * as tripStatus from './rest/trip-status.js'
import * as vehicleRequests from './rest/opo/vehicle-requests.js'
import * as profileApprovals from './rest/opo/profile-approvals.js'
import * as gearApprovals from './rest/opo/gear-approvals.js'
import * as manageFleet from './rest/opo/manage-fleet.js'
import { withTransaction } from './services/sqlite.js'

// Create router and add transaction-wrapping functions to it
const router = Router()
router.postTransaction = (...args) => router.post(...args.slice(0, -1), withTransaction(args.at(-1)))
router.putTransaction = (...args) => router.put(...args.slice(0, -1), withTransaction(args.at(-1)))

/**********************
 * All-Purpose Routes
 **********************/
router.get('/all-trips', allTrips.get) // TODO move this to views
router.post('/trip/:tripId/signup', tripMembers.signup)
router.delete('/trip/:tripId/signup', tripMembers.leave)

/**********************
 * User Profile Routes
 **********************/
router.get('/profile', profile.getProfileCard)
router.post('/profile', profile.post)
router.get('/profile/edit-profile', profile.getProfileCardEditable)
router.get('/profile/driver-cert', profile.getDriverCertRequest)
router.post('/profile/driver-cert', profile.postDriverCertRequest)
router.get('/profile/club-leadership', profile.getClubLeadershipRequest)
router.post('/profile/club-leadership', profile.postClubLeadershipRequest)
router.delete('/profile/club-leadership/:id', profile.deleteClubLeadershipRequest)

/*********************
 * Trip Leader Routes
 *********************/
router.postTransaction('/trip', requireAnyLeader, trip.createTrip)
router.put('/trip/:tripId', requireTripLeader, trip.editTrip)
router.delete('/trip/:tripId', requireTripLeader, trip.deleteTrip)

router.put('/trip/:tripId/leader/:userId', requireTripLeader, tripMembers.makeLeader)
router.delete('/trip/:tripId/leader/:userId', requireTripLeader, tripMembers.demote)
router.put('/trip/:tripId/waitlist/:userId', requireTripLeader, tripMembers.sendToWaitlist)
router.put('/trip/:tripId/member/:userId', requireTripLeader, tripMembers.admit)
router.delete('/trip/:tripId/member/:userId', requireTripLeader, tripMembers.reject)

router.put('/trip/:tripId/vehiclerequest', requireTripLeader, tripRequests.putVehicleRequest)
router.put('/trip/:tripId/individual-gear', requireTripLeader, tripRequests.putIndividualGear)
router.delete('/trip/:tripId/individual-gear/:gearId', requireTripLeader, tripRequests.deleteIndividualGear)
router.put('/trip/:tripId/group-gear', requireTripLeader, tripRequests.putGroupGear)
router.delete('/trip/:tripId/group-gear/:gearId', requireTripLeader, tripRequests.deleteGroupGear)
router.put('/trip/:tripId/pcard-request', requireTripLeader, tripRequests.putPcardRequest)
router.delete('/trip/:tripId/pcard-request', requireTripLeader, tripRequests.deletePcardRequest)
router.get('/trip/:tripId/user/:userId', requireTripLeader, profile.getUserTripView)

router.put('/trip/:tripId/check-out', requireTripLeader, tripStatus.checkOut)
router.delete('/trip/:tripId/check-out', requireTripLeader, tripStatus.deleteCheckOut)
router.put('/trip/:tripId/check-in', requireTripLeader, tripStatus.checkIn)
router.delete('/trip/:tripId/check-in', requireTripLeader, tripStatus.deleteCheckIn)
router.put('/trip/:tripId/present/:memberId', requireTripLeader, tripStatus.markUserPresent)
router.delete('/trip/:tripId/present/:memberId', requireTripLeader, tripStatus.markUserAbsent)

/*************
 * OPO Routes
 *************/
router.get('/opo/vehicle-requests', requireOpo, vehicleRequests.get)

router.get('/opo/profile-approvals/leaders', requireOpo, profileApprovals.getLeadershipRequests)
router.put('/opo/profile-approvals/leaders/:req_id', requireOpo, profileApprovals.approveLeadershipRequest)
router.delete('/opo/profile-approvals/leaders/:req_id', requireOpo, profileApprovals.denyLeadershipRequest)

router.get('/opo/profile-approvals/certs', requireOpo, profileApprovals.getCertRequests)
router.put('/opo/profile-approvals/certs/:req_id', requireOpo, profileApprovals.approveCertRequest)
router.delete('/opo/profile-approvals/certs/:req_id', requireOpo, profileApprovals.denyCertRequest)

router.get('/opo/manage-fleet', requireOpo, manageFleet.get)
router.post('/opo/manage-fleet', requireOpo, manageFleet.post)
router.delete('/opo/manage-fleet/:id', requireOpo, manageFleet.del)

router.put('/opo/vehiclerequest/:requestId/approve', requireOpo, gearApprovals.approveVehicleRequest)
router.put('/opo/vehiclerequest/:requestId/deny', requireOpo, gearApprovals.denyVehicleRequest)
router.put('/opo/vehiclerequest/:requestId/reset', requireOpo, gearApprovals.resetVehicleRequest)

router.put('/opo/member-gear/:tripId/approve', requireOpo, gearApprovals.approveMemberGear)
router.put('/opo/member-gear/:tripId/deny', requireOpo, gearApprovals.denyMemberGear)
router.put('/opo/member-gear/:tripId/reset', requireOpo, gearApprovals.resetMemberGear)

router.put('/opo/group-gear/:tripId/approve', requireOpo, gearApprovals.approveGroupGear)
router.put('/opo/group-gear/:tripId/deny', requireOpo, gearApprovals.denyGroupGear)
router.put('/opo/group-gear/:tripId/reset', requireOpo, gearApprovals.resetGroupGear)

router.put('/opo/pcard/:tripId/approve', requireOpo, gearApprovals.approvePcard)
router.put('/opo/pcard/:tripId/deny', requireOpo, gearApprovals.denyPcard)
router.put('/opo/pcard/:tripId/reset', requireOpo, gearApprovals.resetPcard)

export default router
