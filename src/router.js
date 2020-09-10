import { Router } from 'express';
import * as Trips from './controllers/trip-controller';
import * as Users from './controllers/user-controller';
import * as Clubs from './controllers/club-controller';
import * as VehicleRequests from './controllers/vehicle-request-controller';
import * as Vehicles from './controllers/vehicle-controller';
import signS3 from './services/s3';
import { requireAuth } from './services/passport';


import mailer from './services/emailing';


const router = Router();

router.get('/sign-s3', signS3);


router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' });
});

router.post('/signin-simple', Users.signinSimple);
router.get('/signin-cas', Users.signinCAS);
router.post('/signup', Users.signup);

router.route('/alltrips')
  .post(requireAuth, Trips.createTrip)
  .get(requireAuth, Trips.getTrips);

router.get('/trips/:club', Trips.getTripsByClub);

router.route('/trip/:tripID')
  .get(requireAuth, Trips.getTrip)
  .put(requireAuth, Trips.updateTrip)
  .delete(requireAuth, Trips.deleteTrip);

router.put('/set-attendence/:tripID', requireAuth, Trips.setMemberAttendance);
router.put('/toggle-returned/:tripID', requireAuth, Trips.toggleTripReturnedStatus);
router.put('/jointrip/:tripID', requireAuth, Trips.joinTrip);
router.put('/movetopending/:tripID', requireAuth, Trips.moveToPending);
router.put('/assignToLeader/:tripID', requireAuth, Trips.assignToLeader);

router.put('/addpending/:tripID', requireAuth, Trips.addToPending);
router.put('/editusergear/:tripID', requireAuth, Trips.editUserGear);


router.route('/user')
  .get(requireAuth, Users.getUser)
  .put(requireAuth, Users.updateUser);

router.route('/users').get(requireAuth, Users.getUsers);

router.get('/myTrips', requireAuth, Users.myTrips);
router.post('/leaveTrip/:tripID', requireAuth, Trips.leaveTrip);
router.get('/userTrips', requireAuth, Users.userTrips);

// router.get('/isOnTrip/:tripID', requireAuth, Trips.isOnTrip);

router.route('/club')
  .post(Clubs.createClub)
  .get(Clubs.allClubs);

router.route('/leaderapprovals')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Users.getLeaderRequests)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Users.respondToLeaderRequest);

router.route('/certapprovals')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Users.getCertRequests)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Users.respondToCertRequest);

router.route('/opotrips')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getOPOTrips);

router.route('/gearrequests')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getGearRequests);

router.route('/gearrequest/:tripID')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getTrip)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Trips.respondToGearRequest);

router.route('/pcardrequest/:tripID')
  .put(requireAuth, Users.roleAuthorization(['OPO']), Trips.respondToPCardRequest);

router.route('/trippeegearrequests')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getTrippeeGearRequests);

router.route('/trippeegearrequest/:tripID')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getTrip)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Trips.respondToTrippeeGearRequest);

router.route('/vehiclerequest/:id')
  .get(requireAuth, VehicleRequests.getVehicleRequest)
  .put(requireAuth, VehicleRequests.updateVehicleRequest);

router.route('/vehicleRequests')
  .post(requireAuth, VehicleRequests.makeVehicleRequest)
  .get(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.getVehicleRequests);

router.route('/vehicles')
  .get(requireAuth, Vehicles.getVehicles)
  .post(requireAuth, Users.roleAuthorization(['OPO']), Vehicles.createVehicle);

router.route('/vehicles/:id')
  .delete(requireAuth, Users.roleAuthorization(['OPO']), Vehicles.deleteVehicle);

router.route('/opoVehicleRequest/:id')
  .post(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.respondToVehicleRequest)
  .delete(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.cancelAssignments)
  .put(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.denyVehicleRequest);

router.route('/vehicle-requests/check-conflict')
  .post(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.precheckAssignment);

router.route('/vehicle-assignments')
  .get(requireAuth, VehicleRequests.getVehicleAssignments);

router.route('/debug')
  .post((req, res) => {
    mailer.send(req.body);
  });


export default router;
