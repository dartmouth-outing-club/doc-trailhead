import { Router } from 'express'

import * as tripView from './rest/trip.js'

import signS3 from './services/s3.js'
import { requireAuth, signinCAS } from './services/authentication.js'

const router = Router()

router.get('/sign-s3', signS3)

router.get('/', requireAuth, (req, res) => {
  const url = req.user.is_opo === 1 ? '/opo/trip-approvals.html' : '/home.html'
  res.redirect(url)
})
router.get('/signin-cas', signinCAS)

router.route('/trip/:id').get(requireAuth, tripView.get)

export default router
