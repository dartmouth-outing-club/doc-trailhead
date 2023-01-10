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
import * as manageFleet from './rest/opo/manage-fleet.js'

const router = Router()

router.get('/index', index.get)

router.get('/opo/trip-approvals', tripApprovals.get)
router.get('/opo/vehicle-requests', vehicleRequests.get)

router.get('/opo/profile-approvals/leaders', profileApprovals.getLeadershipRequests)
router.put('/opo/profile-approvals/leaders/:req_id', profileApprovals.approveLeadershipRequest)
router.delete('/opo/profile-approvals/leaders/:req_id', profileApprovals.denyLeadershipRequest)

router.get('/opo/profile-approvals/certs', profileApprovals.getCertRequests)
router.put('/opo/profile-approvals/certs/:req_id', profileApprovals.approveCertRequest)
router.delete('/opo/profile-approvals/certs/:req_id', profileApprovals.denyCertRequest)

router.get('/opo/manage-fleet', manageFleet.get)
router.post('/opo/manage-fleet', manageFleet.post)
router.delete('/opo/manage-fleet/:id', manageFleet.del)

router.get('/all-trips', requireAuth, allTrips.get)
router.get('/my-trips', requireAuth, myTrips.get)

router.get('/profile', requireAuth, profile.getProfileView)
router.post('/profile', requireAuth, profile.post)
router.get('/profile/edit-profile', requireAuth, profile.getProfileEditable)
router.get('/profile/driver-cert', requireAuth, profile.getDriverCertRequest)
router.post('/profile/driver-cert', requireAuth, profile.postDriverCertRequest)
router.get('/profile/club-leadership', requireAuth, profile.getClubLeadershipRequest)
router.post('/profile/club-leadership', requireAuth, profile.postClubLeadershipRequest)

router.put('/trip/:tripId/leader/:userId', trip.makeLeader)
router.delete('/trip/:tripId/leader/:userId', trip.demote)
router.put('/trip/:tripId/waitlist/:userId', trip.sendToWaitlist)
router.put('/trip/:tripId/member/:userId', trip.admit)
router.delete('/trip/:tripId/member/:userId', trip.reject)

export default router
