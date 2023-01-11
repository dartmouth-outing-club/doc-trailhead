import { Router } from 'express'

import { requireAuth } from './services/authentication.js'

import * as index from './rest/index.js'
import * as allTrips from './rest/all-trips.js'
import * as myTrips from './rest/my-trips.js'
import * as profile from './rest/profile.js'
import * as trip from './rest/trip.js'
import * as tripApprovals from './rest/opo/trip-approvals.js'
import * as vehicleRequests from './rest/opo/vehicle-requests.js'
import * as profileApprovals from './rest/opo/profile-approvals.js'
import * as gearApprovals from './rest/opo/gear-approvals.js'
import * as manageFleet from './rest/opo/manage-fleet.js'

const router = Router()

router.get('/index', index.get)

router.get('/profile', requireAuth, profile.getProfileView)
router.post('/profile', requireAuth, profile.post)
router.get('/profile/edit-profile', requireAuth, profile.getProfileEditable)
router.get('/profile/driver-cert', requireAuth, profile.getDriverCertRequest)
router.post('/profile/driver-cert', requireAuth, profile.postDriverCertRequest)
router.get('/profile/club-leadership', requireAuth, profile.getClubLeadershipRequest)
router.post('/profile/club-leadership', requireAuth, profile.postClubLeadershipRequest)
router.delete('/profile/club-leadership/:id', requireAuth, profile.deleteClubLeadershipRequest)

router.get('/all-trips', requireAuth, allTrips.get)
router.get('/my-trips', requireAuth, myTrips.get)

router.post('/trip/:tripId/signup', requireAuth, trip.signup)
router.delete('/trip/:tripId/signup', requireAuth, trip.leave)

router.put('/trip/:tripId/leader/:userId', trip.makeLeader)
router.delete('/trip/:tripId/leader/:userId', trip.demote)
router.put('/trip/:tripId/waitlist/:userId', trip.sendToWaitlist)
router.put('/trip/:tripId/member/:userId', trip.admit)
router.delete('/trip/:tripId/member/:userId', trip.reject)

router.get('/opo/trip-approvals', tripApprovals.get)
router.get('/opo/vehicle-requests', vehicleRequests.get)

router.get('/opo/profile-approvals/leaders', profileApprovals.getLeadershipRequests)
router.put('/opo/profile-approvals/leaders/:req_id', profileApprovals.approveLeadershipRequest)
router.delete('/opo/profile-approvals/leaders/:req_id', profileApprovals.denyLeadershipRequest)

router.get('/opo/profile-approvals/certs', profileApprovals.getCertRequests)
router.put('/opo/profile-approvals/certs/:req_id', profileApprovals.approveCertRequest)
router.delete('/opo/profile-approvals/certs/:req_id', profileApprovals.denyCertRequest)

router.get('/opo/manage-fleet', requireAuth, manageFleet.get)
router.post('/opo/manage-fleet', requireAuth, manageFleet.post)
router.delete('/opo/manage-fleet/:id', requireAuth, manageFleet.del)

router.put('/opo/member-gear/:id/approve', requireAuth, gearApprovals.approveMemberGear)
router.put('/opo/member-gear/:id/deny', requireAuth, gearApprovals.denyMemberGear)
router.put('/opo/member-gear/:id/reset', requireAuth, gearApprovals.resetMemberGear)

router.put('/opo/group-gear/:id/approve', requireAuth, gearApprovals.approveGroupGear)
router.put('/opo/group-gear/:id/deny', requireAuth, gearApprovals.denyGroupGear)
router.put('/opo/group-gear/:id/reset', requireAuth, gearApprovals.resetGroupGear)

router.put('/opo/pcard/:id/approve', requireAuth, gearApprovals.approvePcard)
router.put('/opo/pcard/:id/deny', requireAuth, gearApprovals.denyPcard)
router.put('/opo/pcard/:id/reset', requireAuth, gearApprovals.resetPcard)

export default router
