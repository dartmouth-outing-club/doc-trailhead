import { Router } from 'express'
import * as index from './rest/index.js'
import * as login from './rest/login.js'

const router = Router()

router.get('/index', index.get)

router.get('/login', login.post)

export default router
