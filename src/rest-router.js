import { Router } from 'express'

import * as allTrips from './rest/all-trips.js'
import * as myTrips from './rest/my-trips.js'
import * as profile from './rest/profile.js'
import * as trip from './rest/trip.js'
import * as tripMembers from './rest/trip-members.js'
import * as tripApprovals from './rest/opo/trip-approvals.js'
import * as vehicleRequests from './rest/opo/vehicle-requests.js'
import * as profileApprovals from './rest/opo/profile-approvals.js'
import * as gearApprovals from './rest/opo/gear-approvals.js'
import * as manageFleet from './rest/opo/manage-fleet.js'

const router = Router()

router.get('/profile', profile.getProfileView)
router.post('/profile', profile.post)
router.get('/profile/edit-profile', profile.getProfileEditable)
router.get('/profile/driver-cert', profile.getDriverCertRequest)
router.post('/profile/driver-cert', profile.postDriverCertRequest)
router.get('/profile/club-leadership', profile.getClubLeadershipRequest)
router.post('/profile/club-leadership', profile.postClubLeadershipRequest)
router.delete('/profile/club-leadership/:id', profile.deleteClubLeadershipRequest)

router.get('/all-trips', allTrips.get)
router.get('/my-trips', myTrips.get)

router.post('/trip', trip.createTrip)

router.post('/trip/:tripId/signup', tripMembers.signup)
router.delete('/trip/:tripId/signup', tripMembers.leave)
router.put('/trip/:tripId/leader/:userId', tripMembers.makeLeader)
router.delete('/trip/:tripId/leader/:userId', tripMembers.demote)
router.put('/trip/:tripId/waitlist/:userId', tripMembers.sendToWaitlist)
router.put('/trip/:tripId/member/:userId', tripMembers.admit)
router.delete('/trip/:tripId/member/:userId', tripMembers.reject)

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

router.put('/opo/member-gear/:id/approve', gearApprovals.approveMemberGear)
router.put('/opo/member-gear/:id/deny', gearApprovals.denyMemberGear)
router.put('/opo/member-gear/:id/reset', gearApprovals.resetMemberGear)

router.put('/opo/group-gear/:id/approve', gearApprovals.approveGroupGear)
router.put('/opo/group-gear/:id/deny', gearApprovals.denyGroupGear)
router.put('/opo/group-gear/:id/reset', gearApprovals.resetGroupGear)

router.put('/opo/pcard/:id/approve', gearApprovals.approvePcard)
router.put('/opo/pcard/:id/deny', gearApprovals.denyPcard)
router.put('/opo/pcard/:id/reset', gearApprovals.resetPcard)

export default router
