import { Router } from 'express'

import * as welcome from './routes/welcome.js'
import * as assignments from './routes/assignments.js'
import * as trip from './routes/trip.js'
import * as profile from './routes/profile.js'
import * as waivers from './routes/waivers.js'
import * as tripStatus from './routes/trip-status.js'
import * as vehicleRequestView from './routes/vehicle-request.js'
import * as allTripsView from './routes/all-trips.js'
import * as myTripsView from './routes/my-trips.js'
import * as tripRequests from './routes/trip-requests.js'

import * as tripMembers from './routes/trip-members.js'
import * as gearApprovals from './routes/opo/gear-approvals.js'

import * as tripApprovalsView from './routes/opo/trip-approvals.js'
import * as vehicleRequests from './routes/opo/vehicle-requests.js'

import * as profileApprovals from './routes/opo/profile-approvals.js'
import * as manageFleet from './routes/opo/manage-fleet.js'

import * as authentication from './services/authentication.js'
const { requireAuth, requireAnyLeader, requireTripLeader, requireOpo } = authentication

const router = Router()

// Helper functions to make the routes a little more readable
router.enableRender = (path) => router.get(`/${path}`, (_req, res) => res.render(`${path}.njk`))
// TODO add back transactions
// router.postTransaction = (...args) => router.post(...args.slice(0, -1), withTransaction(args.at(-1)))
// router.putTransaction = (...args) => router.put(...args.slice(0, -1), withTransaction(args.at(-1)))

router.get('/', requireAuth, (req, res) => {
  const is_opo = req.db.get('SELECT is_opo FROM users WHERE id = ?', req.user)?.is_opo
  const url = is_opo === 1 ? '/opo/trip-approvals' : '/all-trips'
  res.redirect(url)
})
router.get('/signin-cas', authentication.signinCAS)
router.post('/logout', requireAuth, authentication.logout)

/**********************
 * Basic webpage URLs
 **********************/
router.get('/welcome', welcome.get)
router.get('/my-trips', requireAuth, myTripsView.get)
router.get('/create-trip', requireAnyLeader, trip.getCreateView)
router.get('/new-user', requireAuth, profile.getNewUserView)
router.get('/all-trips', requireAuth, allTripsView.get)
router.get('/opo/vehicle-requests', requireOpo, vehicleRequests.get)
router.get('/opo/trip-approvals', requireOpo, tripApprovalsView.get)
router.get('/opo/manage-fleet', requireOpo, manageFleet.get)
router.get('/opo/profile-approvals', requireOpo, profileApprovals.get)
router.get('/leader/trip/:tripId', requireTripLeader, trip.getLeaderView)
router.get('/opo/calendar', requireOpo, (_req, res) => {
  res.render('views/opo/calendar.njk', { LICENSE_KEY: process.env.FULLCALENDAR_LICENSE })
})

/**********************
 * All-Purpose Routes
 **********************/
router.post('/trip/:tripId/signup', requireAuth, tripMembers.signup)
router.delete('/trip/:tripId/signup', requireAuth, tripMembers.leave)

router.get('/trip/:tripId', requireAuth, trip.getSignupView)
router.get('/trip/:tripId/edit', requireTripLeader, trip.getEditView)
router.get('/trip/:tripId/check-out', requireTripLeader, tripStatus.getCheckOutView)
router.get('/trip/:tripId/check-in', requireTripLeader, tripStatus.getCheckInView)
router.get('/trip/:tripId/requests', requireTripLeader, tripRequests.getRequestsView)

router.get('/waivers/:waiverPath', requireAuth, waivers.getWaiverView)

/**********************
 * User Profile Routes
 **********************/
router.get('/profile', requireAuth, profile.getProfileView)
router.post('/profile', requireAuth, profile.post)
router.get('/profile/edit-profile', requireAuth, profile.getProfileCardEditable)
router.get('/profile/driver-cert', requireAuth, profile.getDriverCertRequest)
router.post('/profile/driver-cert', requireAuth, profile.postDriverCertRequest)
router.get('/profile/club-leadership', requireAuth, profile.getClubLeadershipRequest)
router.post('/profile/club-leadership', requireAuth, profile.postClubLeadershipRequest)
router.delete('/profile/club-leadership/:id', requireAuth, profile.deleteClubLeadershipRequest)

/*********************
 * Trip Leader Routes
 *********************/
router.post('/trip', requireAnyLeader, trip.createTrip)
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
router.delete('/trip/:tripId/pcard-request/cost/:costId', requireTripLeader, tripRequests.deleteOtherCost)

router.get('/trip/:tripId/user/:userId', requireTripLeader, profile.getUserTripView)
router.get('/vehicle-request/:vehicleRequestId', requireAuth, vehicleRequestView.getVehicleRequestView)

router.put('/trip/:tripId/check-out', requireTripLeader, tripStatus.checkOut)
router.delete('/trip/:tripId/check-out', requireTripLeader, tripStatus.deleteCheckOut)
router.put('/trip/:tripId/check-in', requireTripLeader, tripStatus.checkIn)
router.delete('/trip/:tripId/check-in', requireTripLeader, tripStatus.deleteCheckIn)
router.put('/trip/:tripId/present/:memberId', requireTripLeader, tripStatus.markUserPresent)
router.delete('/trip/:tripId/present/:memberId', requireTripLeader, tripStatus.markUserAbsent)

/*************
 * OPO Routes
 *************/
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

router.post('/opo/manage-fleet', requireOpo, manageFleet.post)
router.delete('/opo/manage-fleet/:id', requireOpo, manageFleet.del)

router.put('/opo/profile-approvals/leaders/:req_id', requireOpo, profileApprovals.approveLeadershipRequest)
router.delete('/opo/profile-approvals/leaders/:req_id', requireOpo, profileApprovals.denyLeadershipRequest)
router.put('/opo/profile-approvals/certs/:req_id', requireOpo, profileApprovals.approveCertRequest)
router.delete('/opo/profile-approvals/certs/:req_id', requireOpo, profileApprovals.denyCertRequest)

// Some components
router.enableRender('components/save-button')

// Look, JSON APIs! See, I'm not a zealot
router.get('/json/calendar', requireOpo, assignments.get)

// Developer routes
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-login', authentication.devLogin)
}

export default router
