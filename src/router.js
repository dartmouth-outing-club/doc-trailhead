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

router.get('/userTrips', requireAuth, users.userTrips)

router.route('/club')
  .get(clubs.allClubs)
  .post(requireAuth, clubs.createClub)

router.route('/leaderapprovals')
  .get(requireAuth, users.roleAuthorization(['OPO']), users.getLeaderRequests)
  .put(requireAuth, users.roleAuthorization(['OPO']), users.respondToLeaderRequest)

router.route('/certapprovals')
  .get(requireAuth, users.roleAuthorization(['OPO']), users.getCertRequests)
  .put(requireAuth, users.roleAuthorization(['OPO']), users.respondToCertRequest)

router.route('/opotrips')
  .get(requireAuth, users.roleAuthorization(['OPO']), trips.getOPOTrips)

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

router.route('/vehicle-request/:id')
  .get(requireAuth, vehicleRequests.getVehicleRequest)
  .put(requireAuth, vehicleRequests.updateVehicleRequest)
  .delete(requireAuth, vehicleRequests.deleteVehicleRequest)

router.route('/vehicleRequests')
  .post(requireAuth, vehicleRequests.createVehicleRequest)
  .get(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.getAllCurrentVehicleRequests)

router.route('/assignments')
  .get(requireAuth, users.roleAuthorization(['OPO']), assignments.getAssignmentsForCalendar)

router.route('/vehicles')
  .get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), vehicles.getActiveVehicles)
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicles.createVehicle)

router.route('/vehicles/:id')
  .delete(requireAuth, users.roleAuthorization(['OPO']), vehicles.deleteVehicle)

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.respondToVehicleRequest)
  .delete(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.cancelAssignments)
  .put(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.denyVehicleRequest)

router.route('/vehicle-assignments')
  .get(requireAuth, vehicleRequests.getVehicleAssignments)

router.route('/debug')
  .post((req) => {
    mailer.send(req.body)
  })

export default router
