import { Router } from 'express'

import * as users from './controllers/user-controller.js'
import * as clubs from './controllers/club-controller.js'
import * as trips from './controllers/trip-controller.js'
import * as vehicleRequests from './controllers/vehicle-request-controller.js'
import * as vehicles from './controllers/vehicle-controller.js'
import * as assignments from './controllers/assignment-controller.js'
import signS3 from './services/s3.js'
import { requireAuth, signinSimple, signinCAS } from './services/passport.js'

import * as mailer from './services/mailer.js'

const router = Router()

router.get('/sign-s3', signS3)

router.get('/', (_req, res) => {
  res.json({ message: 'welcome to our doc app!' })
})

router.post('/signin-simple', signinSimple)
router.get('/signin-cas', signinCAS)

router.route('/user')
  .get(requireAuth, users.getUser)
  .put(requireAuth, users.updateUser)

router.route('/users').get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), users.getUsers)

// This route is used to populate co-leader dropdowns
// The way trailhead functions, anyone is a potential leader
// TODO slim this down to only active users
router.route('/leaders').get(requireAuth, users.getUsers)

router.get('/myTrips', requireAuth, users.myTrips)

router.route('/club')
  .get(clubs.allClubs)
  .post(requireAuth, clubs.createClub)

router.route('/leaderapprovals')
  .get(requireAuth, users.roleAuthorization(['OPO']), users.handleGetLeaderApprovals)
  .put(requireAuth, users.roleAuthorization(['OPO']), users.handlePutLeaderApprovals)

router.route('/certapprovals')
  .get(requireAuth, users.roleAuthorization(['OPO']), users.handleGetCertApprovals)
  .put(requireAuth, users.roleAuthorization(['OPO']), users.handlePutCertApprovals)

router.route('/opotrips')
  .get(requireAuth, users.roleAuthorization(['OPO']), trips.handleGetOpoTrips)

router.route('/gearrequest/:tripID')
  .get(requireAuth, users.roleAuthorization(['OPO']), trips.getTrip)
  .put(requireAuth, users.roleAuthorization(['OPO']), (req, res) => {
    trips.respondToGearRequest(req.params.tripID, req.body.status).then((updatedTrip) => { return res.json(updatedTrip) }).catch((error) => { return res.status(500).json(error) })
  })

router.route('/pcardrequest/:tripID')
  .put(requireAuth, users.roleAuthorization(['OPO']), trips.respondToPCardRequest)

router.route('/trippeegearrequest/:tripID')
  .get(requireAuth, users.roleAuthorization(['OPO']), trips.getTrip)
  .put(requireAuth, users.roleAuthorization(['OPO']), (req, res) => {
    trips.respondToTrippeeGearRequest(req.params.tripID, req.body.status).then((updatedTrip) => { res.json(updatedTrip) }).catch((error) => { return res.status(500).json(error) })
  })

router.route('/vehicles')
  .get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), vehicles.handleGetVehicles)
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicles.handlePostVehicles)

router.route('/vehicles/:id')
  .delete(requireAuth, users.roleAuthorization(['OPO']), vehicles.handleDeleteVehicle)

router.route('/assignments')
  .get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), assignments.handleGetAssignmentsForCalendar)

router.route('/vehicle-request/:id')
  .get(requireAuth, vehicleRequests.handleGetVehicleRequest)
  .put(requireAuth, vehicleRequests.handlePutVehicleRequest)
  .delete(requireAuth, vehicleRequests.handleDeleteVehicleRequest)

router.route('/vehicleRequests')
  .post(requireAuth, vehicleRequests.handlePostVehicleRequests)
  .get(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.handleGetVehicleRequests)

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.handleOpoPost)
  .delete(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.handleOpoDelete)
  .put(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.handleOpoPut)

router.route('/debug')
  .post((req) => {
    mailer.send(req.body)
  })

export default router
