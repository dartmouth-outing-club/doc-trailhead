import { Router } from 'express'
import * as index from './rest/index.js'
import * as tripApprovals from './rest/opo/trip-approvals.js'

const router = Router()

router.get('/index', index.get)

router.get('/opo/trip-approvals', tripApprovals.get)

export default router
