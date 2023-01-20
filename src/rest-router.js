import { Router } from 'express'

import { requireOpo } from './services/authentication.js'
import * as allTrips from './rest/all-trips.js'
import * as profile from './rest/profile.js'
import * as trip from './rest/trip.js'
import * as tripMembers from './rest/trip-members.js'
import * as tripRequests from './rest/trip-requests.js'
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

router.get('/all-trips', allTrips.get) // TODO move this to views

router.post('/trip', trip.createTrip)
router.put('/trip/:tripId', trip.editTrip)
router.delete('/trip/:tripId', trip.deleteTrip)

router.post('/trip/:tripId/signup', tripMembers.signup)
router.delete('/trip/:tripId/signup', tripMembers.leave)
router.put('/trip/:tripId/leader/:userId', tripMembers.makeLeader)
router.delete('/trip/:tripId/leader/:userId', tripMembers.demote)
router.put('/trip/:tripId/waitlist/:userId', tripMembers.sendToWaitlist)
router.put('/trip/:tripId/member/:userId', tripMembers.admit)
router.delete('/trip/:tripId/member/:userId', tripMembers.reject)

router.put('/trip/:tripId/vehiclerequest', tripRequests.putVehicleRequest)
router.put('/trip/:tripId/individual-gear', tripRequests.putIndividualGear)
router.delete('/trip/:tripId/individual-gear/:gearId', tripRequests.deleteIndividualGear)
router.put('/trip/:tripId/group-gear', tripRequests.putGroupGear)
router.delete('/trip/:tripId/group-gear/:gearId', tripRequests.deleteGroupGear)
router.put('/trip/:tripId/pcard-request', tripRequests.putPcardRequest)
router.delete('/trip/:tripId/pcard-request', tripRequests.deletePcardRequest)

router.get('/opo/trip-approvals', requireOpo, tripApprovals.get)
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
