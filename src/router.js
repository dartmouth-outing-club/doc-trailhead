import { Router } from 'express'

import * as users from './controllers/user-controller.js'
import * as clubs from './controllers/club-controller.js'
import * as trips from './controllers/trip-controller.js'
import * as vehicleRequests from './controllers/vehicle-request-controller.js'
import * as vehicles from './controllers/vehicle-controller.js'
import signS3 from './services/s3.js'
import { logError } from './services/error.js'
import { requireAuth } from './services/passport.js'

import * as mailer from './services/emailing.js'

const router = Router()

router.get('/sign-s3', signS3)

router.get('/', (_req, res) => {
  res.json({ message: 'welcome to our doc app!' })
})

router.post('/signin-simple', users.signinSimple)
router.get('/signin-cas', users.signinCAS)
router.post('/signup', users.signup)

router.route('/user')
  .get(requireAuth, users.getUser)
  .put(requireAuth, users.updateUser)

router.route('/users').get(requireAuth, users.roleAuthorization(['Leader']), users.getUsers)

router.route('/leaders').get(requireAuth, users.getLeaders)

router.get('/myTrips', requireAuth, users.myTrips)

router.get('/userTrips', requireAuth, users.userTrips)

router.route('/club')
  .post(clubs.createClub)
  .get(clubs.allClubs)

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
  .delete(requireAuth, (req, res) => {
    vehicleRequests.deleteVehicleRequest(req.params.id)
      .then(() => { return res.sendStatus(200) })
      .catch((error) => {
        logError({ type: 'cancelVehicleRequest', message: error.message })
        res.status(500).send(error.message)
      })
  })

router.route('/vehicleRequests')
  .post(requireAuth, vehicleRequests.makeVehicleRequest)
  .get(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.getVehicleRequests)

router.route('/vehicles')
  .get(requireAuth, vehicles.getVehicles)
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicles.createVehicle)

router.route('/vehicles/:id')
  .delete(requireAuth, users.roleAuthorization(['OPO']), vehicles.deleteVehicle)

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.respondToVehicleRequest)
  .delete(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.cancelAssignments)
  .put(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.denyVehicleRequest)

router.route('/vehicle-requests/check-conflict')
  .post(requireAuth, users.roleAuthorization(['OPO']), vehicleRequests.precheckAssignment)

router.route('/vehicle-assignments')
  .get(requireAuth, vehicleRequests.getVehicleAssignments)

router.route('/debug')
  .post((req) => {
    mailer.send(req.body)
  })

export default router
