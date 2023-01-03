import { Router } from 'express'
import * as index from './rest/index.js'
import * as tripApprovals from './rest/opo/trip-approvals.js'
import * as vehicleRequests from './rest/opo/vehicle-requests.js'
import * as profileApprovals from './rest/opo/profile-approvals.js'

const router = Router()

router.get('/index', index.get)

router.get('/opo/trip-approvals', tripApprovals.get)
router.get('/opo/vehicle-requests', vehicleRequests.get)
router.get('/opo/profile-approvals/leaders', profileApprovals.getLeadershipRequests)
router.get('/opo/profile-approvals/certs', profileApprovals.getCertRequests)

export default router
