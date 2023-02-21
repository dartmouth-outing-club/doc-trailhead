import { Router } from 'express'
import * as sqlite from './services/sqlite.js'

import * as welcome from './views/welcome.js'
import * as assignments from './rest/assignments.js'
import * as tripView from './views/trip.js'
import * as profileView from './views/profile.js'
import * as tripStatusView from './views/trip-status.js'
import * as vehicleRequestView from './views/vehicle-request.js'
import * as allTripsView from './views/all-trips.js'
import * as myTripsView from './views/my-trips.js'
import * as requestsView from './views/trip-requests.js'

import * as tripApprovalsView from './views/opo/trip-approvals.js'
import * as vehicleRequestsView from './views/opo/vehicle-requests.js'

import * as profileApprovals from './views/opo/profile-approvals.js'
import * as manageFleet from './views/opo/manage-fleet.js'

import signS3 from './services/s3.js'
import * as authentication from './services/authentication.js'
const { requireAuth, requireAnyLeader, requireTripLeader, requireOpo } = authentication

const router = Router()

// Helper function that makes it easy to declare new views
router.enableRender = (path) => router.get(`/${path}`, (_req, res) => res.render(`${path}.njk`))

router.get('/sign-s3', signS3)

router.get('/', requireAuth, (req, res) => {
  const is_opo = sqlite.get('SELECT is_opo FROM users WHERE id = ?', req.user)?.is_opo
  const url = is_opo === 1 ? '/opo/trip-approvals' : '/all-trips'
  res.redirect(url)
})

router.get('/welcome', welcome.get)

router.get('/signin-cas', authentication.signinCAS)
router.post('/logout', requireAuth, authentication.logout)

router.get('/my-trips', requireAuth, myTripsView.get)
router.get('/create-trip', requireAuth, requireAnyLeader, tripView.getCreateView)
router.get('/new-user', requireAuth, profileView.getNewUserView)
router.get('/all-trips', requireAuth, allTripsView.get)

router.get('/opo/vehicle-requests', requireAuth, requireOpo, vehicleRequestsView.get)
router.get('/opo/trip-approvals', requireAuth, requireOpo, tripApprovalsView.get)

router.get('/trip/:tripId', requireAuth, tripView.getSignupView)
router.get('/trip/:tripId/edit', requireAuth, requireTripLeader, tripView.getEditView)
router.get('/trip/:tripId/check-out', requireAuth, requireTripLeader, tripStatusView.getCheckOutView)
router.get('/trip/:tripId/check-in', requireAuth, requireTripLeader, tripStatusView.getCheckInView)
router.get('/trip/:tripId/requests', requireAuth, requireTripLeader, requestsView.getRequestsView)
router.get('/trip/:tripId/user/:userId', requireAuth, requireTripLeader, tripView.getUserView)

router.get('/opo/manage-fleet', requireAuth, requireOpo, manageFleet.get)
router.post('/opo/manage-fleet', requireAuth, requireOpo, manageFleet.post)
router.delete('/opo/manage-fleet/:id', requireAuth, requireOpo, manageFleet.del)

router.get('/opo/profile-approvals', requireAuth, requireOpo, profileApprovals.get)
router.put('/opo/profile-approvals/leaders/:req_id', requireAuth, requireOpo, profileApprovals.approveLeadershipRequest)
router.delete('/opo/profile-approvals/leaders/:req_id', requireAuth, requireOpo, profileApprovals.denyLeadershipRequest)
router.put('/opo/profile-approvals/certs/:req_id', requireAuth, requireOpo, profileApprovals.approveCertRequest)
router.delete('/opo/profile-approvals/certs/:req_id', requireAuth, requireOpo, profileApprovals.denyCertRequest)

router.get('/profile', requireAuth, profileView.getProfileView)

router.get('/vehicle-request/:vehicleRequestId', requireAuth, vehicleRequestView.getVehicleRequestView)
router.get('/leader/trip/:tripId', requireAuth, requireTripLeader, tripView.getLeaderView)

router.get('/opo/calendar', requireAuth, requireOpo, (_req, res) => {
  res.render('views/opo/calendar.njk', { LICENSE_KEY: process.env.FULLCALENDAR_LICENSE })
})

// Some components
router.enableRender('components/save-button')

// Look, JSON APIs! See, I'm not a zealot
router.get('/json/calendar', requireAuth, requireOpo, assignments.get)

// Developer routes
if (process.env.NODE_ENV === 'development') {
  router.post('/dev-login', authentication.devLogin)
}

export default router
