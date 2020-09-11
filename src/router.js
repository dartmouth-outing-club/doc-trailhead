import { Router } from 'express';
import controllers from './controllers';
import signS3 from './services/s3';
import { requireAuth } from './services/passport';

import mailer from './services/emailing';

const router = Router();

router.get('/sign-s3', signS3);

router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' });
});

router.post('/signin-simple', controllers.users.signinSimple);
router.get('/signin-cas', controllers.users.signinCAS);
router.post('/signup', controllers.users.signup);


router.route('/user')
  .get(requireAuth, controllers.users.getUser)
  .put(requireAuth, controllers.users.updateUser);

router.route('/users').get(requireAuth, controllers.users.getUsers);

router.get('/myTrips', requireAuth, controllers.users.myTrips);

router.get('/userTrips', requireAuth, controllers.users.userTrips);

// router.get('/isOnTrip/:tripID', requireAuth, controllers.trips.isOnTrip);

router.route('/club')
  .post(controllers.clubs.createClub)
  .get(controllers.clubs.allClubs);

router.route('/leaderapprovals')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.getLeaderRequests)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.respondToLeaderRequest);

router.route('/certapprovals')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.getCertRequests)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.users.respondToCertRequest);

router.route('/opotrips')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getOPOTrips);

router.route('/gearrequests')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getGearRequests);

router.route('/gearrequest/:tripID')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getTrip)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.respondToGearRequest);

router.route('/pcardrequest/:tripID')
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.respondToPCardRequest);

router.route('/trippeegearrequests')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getTrippeeGearRequests);

router.route('/trippeegearrequest/:tripID')
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.getTrip)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.trips.respondToTrippeeGearRequest);

router.route('/vehiclerequest/:id')
  .get(requireAuth, controllers.vehicleRequests.getVehicleRequest)
  .put(requireAuth, controllers.vehicleRequests.updateVehicleRequest);

router.route('/vehicleRequests')
  .post(requireAuth, controllers.vehicleRequests.makeVehicleRequest)
  .get(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.getVehicleRequests);

router.route('/vehicles')
  .get(requireAuth, controllers.vehicles.getVehicles)
  .post(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicles.createVehicle);

router.route('/vehicles/:id')
  .delete(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicles.deleteVehicle);

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.respondToVehicleRequest)
  .delete(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.cancelAssignments)
  .put(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.denyVehicleRequest);

router.route('/vehicle-requests/check-conflict')
  .post(requireAuth, controllers.users.roleAuthorization(['OPO']), controllers.vehicleRequests.precheckAssignment);

router.route('/vehicle-assignments')
  .get(requireAuth, controllers.vehicleRequests.getVehicleAssignments);

router.route('/debug')
  .post((req, res) => {
    mailer.send(req.body);
  });


export default router;
