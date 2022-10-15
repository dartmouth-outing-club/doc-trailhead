import { Router } from 'express'

import controllers from './controllers/index.js'
import signS3 from './services/s3.js'
import { logError } from './services/error.js'
import { requireAuth } from './services/passport.js'

import mailer from './services/emailing.js'

const router = Router()

router.get('/sign-s3', signS3)

router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' })
})

router.post('/signin-simple', controllers.users.signinSimple)
router.get('/signin-cas', controllers.users.signinCAS)
router.post('/signup', controllers.users.signup)

router.route('/user')
  .get(requireAuth, controllers.users.getUser)
  .put(requireAuth, controllers.users.updateUser)

router.route('/users').get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.getUsers)

router.get('/myTrips', requireAuth, controllers.users.myTrips)

router.get('/userTrips', requireAuth, controllers.users.userTrips)

// router.get('/isOnTrip/:tripID', requireAuth, controllers.trips.isOnTrip);

router.route('/club')
  .post(controllers.clubs.createClub)
  .get(controllers.clubs.allClubs)

router.route('/leaderapprovals')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.getLeaderRequests)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.respondToLeaderRequest)

router.route('/certapprovals')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.getCertRequests)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.respondToCertRequest)

router.route('/opotrips')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getOPOTrips)

router.route('/gearrequest/:tripID')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getTrip)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), (req, res) => {
    controllers.trips.respondToGearRequest(req.params.tripID, req.body.status).then((updatedTrip) => { return res.json(updatedTrip) }).catch((error) => { return res.status(500).json(error) })
  })

router.route('/pcardrequest/:tripID')
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.respondToPCardRequest)

router.route('/trippeegearrequest/:tripID')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getTrip)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), (req, res) => {
    controllers.trips.respondToTrippeeGearRequest(req.params.tripID, req.body.status).then((updatedTrip) => { res.json(updatedTrip) }).catch((error) => { return res.status(500).json(error) })
  })

router.route('/vehicle-request/:id')
  .get(requireAuth, controllers.vehicleRequests.getVehicleRequest)
  .put(requireAuth, controllers.vehicleRequests.updateVehicleRequest)
  .delete(requireAuth, (req, res) => {
    controllers.vehicleRequests.deleteVehicleRequest(req.params.id)
      .then(() => { return res.sendStatus(200) })
      .catch((error) => {
        logError({ type: 'cancelVehicleRequest', message: error.message })
        res.status(500).send(error.message)
      })
  })

router.route('/vehicleRequests')
  .post(requireAuth, controllers.vehicleRequests.makeVehicleRequest)
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.getVehicleRequests)

router.route('/vehicles')
  .get(requireAuth, controllers.vehicles.getVehicles)
  .post(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicles.createVehicle)

router.route('/vehicles/:id')
  .delete(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicles.deleteVehicle)

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.respondToVehicleRequest)
  .delete(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.cancelAssignments)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.denyVehicleRequest)

router.route('/vehicle-requests/check-conflict')
  .post(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.precheckAssignment)

router.route('/vehicle-assignments')
  .get(requireAuth, controllers.vehicleRequests.getVehicleAssignments)

router.route('/debug')
  .post((req) => {
    mailer.send(req.body)
  })

export default router
