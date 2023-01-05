import { Router } from 'express'

import * as index from './rest/index.js'
import * as allTrips from './rest/all-trips.js'
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

router.get('/all-trips', allTrips.get)

export default router
