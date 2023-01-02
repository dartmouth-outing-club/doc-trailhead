import { Router } from 'express'
import * as index from './rest/index.js'

const router = Router()

router.get('/index', index.get)

export default router
