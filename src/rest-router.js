import { Router } from 'express'
import * as index from './rest/index.js'
import * as opo from './rest/opo.js'

const router = Router()

router.get('/index', index.get)

router.get('/opo/pending-trips', opo.getTripsPendingApproval)

export default router
