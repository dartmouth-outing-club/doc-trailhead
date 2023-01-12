import { Router } from 'express'

import * as index from './rest/index.js'
import * as sqlite from './services/sqlite.js'
import * as tripView from './rest/trip.js'

import signS3 from './services/s3.js'
import { requireAuth, signinCAS, logout } from './services/authentication.js'

const router = Router()
router.enableView = function (path, isBehindAuth = false) {
  if (isBehindAuth) {
    this.get(path, (_req, res) => res.render(requireAuth, `views${path}.njs`))
  } else {
    this.get(path, (_req, res) => res.render(`views${path}.njs`))
  }
}

router.get('/sign-s3', signS3)

router.get('/', requireAuth, (req, res) => {
  const is_opo = sqlite.get('SELECT is_opo FROM users WHERE id = ?', req.user)?.is_opo
  const url = is_opo === 1 ? '/opo/trip-approvals.html' : '/welcome'
  res.redirect(url)
})

router.get('/public-trips', index.get)

router.get('/signin-cas', signinCAS)
router.post('/logout', requireAuth, logout)

// Basic views
router.enableView('/welcome')
router.enableView('/all-trips')
router.enableView('/my-trips')
router.enableView('/profile')

// Somewhat more complicated views
router.route('/trip/:id').get(requireAuth, tripView.getSignupView)
router.route('/leader/trip/:id').get(requireAuth, tripView.getLeaderView)

export default router
