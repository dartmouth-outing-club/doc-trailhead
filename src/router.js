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

router.get('/', (req, res) => {
  if (process.env.NODE_ENV === 'development') {
    return req.user ? res.redirect('/home.html') : res.redirect('/')
  }
  res.json({ message: 'welcome to our doc app!' })
})

router.post('/signin-simple', signinSimple)
router.get('/signin-cas', signinCAS)

router.route('/user')
  .get(requireAuth, users.getUser)
  .put(requireAuth, users.updateUser)

router.route('/users').get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), users.getListOfUsers)

// This route is used to populate co-leader dropdowns
// The way trailhead functions, anyone is a potential leader
// TODO slim this down to only active users
router.route('/leaders').get(requireAuth, users.getListOfUsers)

router.get('/myTrips', requireAuth, users.myTrips)

router.route('/club')
  .get(clubs.allClubs)
  .post(requireAuth, clubs.createClub)

router.route('/leaderapprovals')
  .get(requireAuth, users.roleAuthorization(['OPO']), users.handleGetLeaderApprovals)
  .put(requireAuth, users.roleAuthorization(['OPO']), users.handlePutLeaderApprovals)

router.route('/certapprovals')
  .get(requireAuth, users.roleAuthorization(['OPO']), safeCall(users.handleGetCertApprovals))
  .put(requireAuth, users.roleAuthorization(['OPO']), safeCall(users.handlePutCertApprovals))

router.route('/opotrips')
  .get(requireAuth, users.roleAuthorization(['OPO']), safeCall(trips.handleGetOpoTrips))

router.route('/gearrequest/:tripID')
  .get(requireAuth, users.roleAuthorization(['OPO']), safeCall(trips.getTrip))
  .put(requireAuth, users.roleAuthorization(['OPO']), safeCall(trips.respondToGearRequest))

router.route('/pcardrequest/:tripID')
  .put(requireAuth, users.roleAuthorization(['OPO']), safeCall(trips.respondToPCardRequest))

router.route('/trippeegearrequest/:tripID')
  .get(requireAuth, users.roleAuthorization(['OPO']), safeCall(trips.getTrip))
  .put(requireAuth, users.roleAuthorization(['OPO']), safeCall(trips.respondToTrippeeGearRequest))

router.route('/vehicles')
  .get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), safeCall(vehicles.handleGetVehicles))
  .post(requireAuth, users.roleAuthorization(['OPO']), safeCall(vehicles.handlePostVehicles))

router.route('/vehicles/:id')
  .delete(requireAuth, users.roleAuthorization(['OPO']), safeCall(vehicles.handleDeleteVehicle))

router.route('/assignments')
  .get(requireAuth, users.roleAuthorization(['Leader', 'OPO']), safeCall(assignments.handleGetAssignmentsForCalendar))

router.route('/vehicle-request/:id')
  .get(requireAuth, safeCall(vehicleRequests.handleGetVehicleRequest))
  .put(requireAuth, safeCall(vehicleRequests.handlePutVehicleRequest))
  .delete(requireAuth, safeCall(vehicleRequests.handleDeleteVehicleRequest))

router.route('/vehicleRequests')
  .post(requireAuth, safeCall(vehicleRequests.handlePostVehicleRequests))
  .get(requireAuth, users.roleAuthorization(['OPO']), safeCall(vehicleRequests.handleGetVehicleRequests))

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, users.roleAuthorization(['OPO']), safeCall(vehicleRequests.handleOpoPost))
  .delete(requireAuth, users.roleAuthorization(['OPO']), safeCall(vehicleRequests.handleOpoDelete))
  .put(requireAuth, users.roleAuthorization(['OPO']), safeCall(vehicleRequests.handleOpoPut))

router.route('/debug')
  .post((req) => {
    mailer.send(req.body)
  })

router.route('/trips')
  .post(requireAuth, async (req, res) => {
    try {
      const result = await trips.createTrip(req.user, req.body)
      res.json(result)
    } catch (error) {
      console.log(error)
      res.status(500).send('Something went wrong creating the trip.')
    }
  })
  .get(requireAuth, trips.handleGetTrips)

router.route('/trips/public')
  .get(trips.getPublicTrips)

router.route('/trips/:tripID')
  .get(requireAuth, safeCall(trips.getTrip))
  .put(requireAuth, trips.updateTrip)
  .delete(requireAuth, trips.deleteTrip)

router.post('/trips/apply/:tripID', requireAuth, safeCall(trips.apply))

router.post('/trips/reject/:tripID', requireAuth, (req, res) => {
  trips.reject(req.params.tripID, req.body.rejectedUserID).then(() => { return res.json() }).catch((error) => { console.log(error); res.sendStatus(500) })
})

router.post('/trips/admit/:tripID', requireAuth, (req, res) => {
  trips.admit(req.params.tripID, req.body.admittedUserID).then(() => { res.json() }).catch((error) => { console.log(error); res.sendStatus(500) })
})

router.post('/trips/unadmit/:tripID', requireAuth, (req, res) => {
  trips.unadmit(req.params.tripID, req.body.unAdmittedUserID).then(() => { return res.json() }).catch((error) => { console.log(error); res.sendStatus(500) })
})

router.post('/trips/leave/:tripID', requireAuth, async (req, res) => {
  await trips.leave(req.params.tripID, req.body.leavingUserID)
  res.status(200).send()
})

router.put('/trips/set-attendence/:tripID', requireAuth, safeCall(trips.setMemberAttendance))
router.put('/trips/toggle-left/:tripID', requireAuth, safeCall(trips.toggleTripLeftStatus))
router.put('/trips/toggle-returned/:tripID', requireAuth, safeCall(trips.toggleTripReturnedStatus))
router.put('/trips/toggle-leadership/:tripID', requireAuth, safeCall(trips.toggleTripLeadership))

router.put('/trips/editusergear/:tripID', requireAuth, safeCall(trips.editUserGear))

function safeCall (func) {
  return async (req, res) => {
    try {
      await func(req, res)
    } catch (err) {
      console.error(`Error calling function ${func.name}`)
      console.error(err)
      return res.status(500).send('Error completing request')
    }
  }
}
export default router
