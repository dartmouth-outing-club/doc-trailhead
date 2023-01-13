import { Router } from 'express'

import * as index from './rest/index.js'
import * as sqlite from './services/sqlite.js'
import * as tripView from './rest/trip.js'
import * as createTripView from './rest/create-trip.js'

import signS3 from './services/s3.js'
import { requireAuth, signinCAS, logout } from './services/authentication.js'

const router = Router()

// Helper function makes it easy to declare new views
router.enableView = function (path, access) {
  switch (access) {
    case 'public':
      this.route(path).get((_req, res) => res.render(`views${path}.njs`))
      break
    case 'auth':
      this.route(path).get(requireAuth, (_req, res) => res.render(`views${path}.njs`))
      break
    case 'opo':
      this.route(path).get(requireAuth, (_req, res) => res.render(`views${path}.njs`))
      break
    default:
      throw new Error('Incorrect usage of enableView method')
  }
}

router.get('/sign-s3', signS3)

router.get('/', requireAuth, (req, res) => {
  const is_opo = sqlite.get('SELECT is_opo FROM users WHERE id = ?', req.user)?.is_opo
  const url = is_opo === 1 ? '/opo/trip-approvals' : '/welcome'
  res.redirect(url)
})

router.get('/public-trips', index.get)

router.get('/signin-cas', signinCAS)
router.post('/logout', requireAuth, logout)

// Basic views
router.enableView('/welcome', 'public')
router.enableView('/all-trips', 'auth')
router.enableView('/my-trips', 'auth')
router.enableView('/profile', 'auth')
router.enableView('/opo/calendar', 'opo')
router.enableView('/opo/manage-fleet', 'opo')
router.enableView('/opo/profile-approvals', 'opo')
router.enableView('/opo/trip-approvals', 'opo')
router.enableView('/opo/vehicle-requests', 'opo')

// Somewhat more complicated views
router.route('/trip/:id').get(requireAuth, tripView.getSignupView)
router.route('/leader/trip/:id').get(requireAuth, tripView.getLeaderView)
router.route('/create-trip').get(requireAuth, createTripView.get)

export default router
