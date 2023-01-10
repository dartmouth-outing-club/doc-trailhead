import { Router } from 'express'

import * as sqlite from './services/sqlite.js'
import * as tripView from './rest/trip.js'

import signS3 from './services/s3.js'
import { requireAuth, signinCAS, logout } from './services/authentication.js'

const router = Router()

router.get('/sign-s3', signS3)

router.get('/', requireAuth, (req, res) => {
  const is_opo = sqlite.get('SELECT is_opo FROM users WHERE id = ?', req.user)?.is_opo
  const url = is_opo === 1 ? '/opo/trip-approvals.html' : '/welcome.html'
  res.redirect(url)
})

router.get('/signin-cas', signinCAS)
router.post('/logout', requireAuth, logout)

router.route('/trip/:id').get(requireAuth, tripView.get)

export default router
