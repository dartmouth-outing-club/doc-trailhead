import { Router } from 'express';
import * as Trips from './controllers/trip_controller';
import * as Users from './controllers/user_controller';
import * as LeaderApprovals from './controllers/leader_approval_controller';
import * as CertApprovals from './controllers/cert_approval_controller';
import sendEmailToTrip from './controllers/email_controller';
import * as Clubs from './controllers/club_controller';

import * as VehicleRequests from './controllers/vehicle_request_controller';
import * as Vehicles from './controllers/vehicle_controller';
import { requireAuth, requireSignin } from './services/passport';


const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' });
});

router.get('/signin', Users.signin);
router.post('/signup', Users.signup);

router.route('/alltrips')
  .post(requireAuth, Users.roleAuthorization(['Leader']), Trips.createTrip)
  .get(requireAuth, Trips.getTrips);

router.get('/trips/:club', Trips.getTripsByClub);

router.route('/trip/:id')
  .get(requireAuth, Trips.getTrip)
  .put(requireAuth, Trips.updateTrip)
  .delete(requireAuth, Trips.deleteTrip);

router.put('/jointrip/:id', requireAuth, Trips.joinTrip);
router.put('/movetopending/:id', requireAuth, Trips.moveToPending);

router.put('/addpending/:id', requireAuth, Trips.addToPending);
router.put('/editusergear/:id', requireAuth, Trips.editUserGear);


router.route('/user')
  .get(requireAuth, Users.getUser)
  .put(requireAuth, Users.updateUser, LeaderApprovals.addLeaderRequest, CertApprovals.addCertRequest);

router.get('/myTrips', requireAuth, Users.myTrips);
router.delete('/leaveTrip/:id', requireAuth, Trips.leaveTrip);
router.get('/userTrips', requireAuth, Users.userTrips);

router.post('/sendEmailToTrip', sendEmailToTrip);

router.route('/club')
  .post(Clubs.createClub)
  .get(Clubs.allClubs);

router.route('/leaderapprovals')
  .get(requireAuth, Users.roleAuthorization(['OPO']), LeaderApprovals.getApprovals)
  .put(requireAuth, Users.roleAuthorization(['OPO']), LeaderApprovals.respond);

router.route('/certapprovals')
  .get(requireAuth, Users.roleAuthorization(['OPO']), CertApprovals.getApprovals)
  .put(requireAuth, Users.roleAuthorization(['OPO']), CertApprovals.respond);

router.route('/opotrips')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getOPOTrips)

router.route('/gearrequests')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getGearRequests)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Trips.respondToGearRequest);

  router.route('/pcardrequests')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getTrip)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Trips.respondToPCardRequest);

router.route('/trippeegearrequests')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Trips.getTrippeeGearRequests)
  .put(requireAuth, Users.roleAuthorization(['OPO']), Trips.respondToTrippeeGearRequest);

router.route('/vehiclerequest/:id')
  .get(requireAuth, VehicleRequests.getVehicleRequest)
  .put(requireAuth, VehicleRequests.updateVehicleRequest)

router.route('/vehicleRequests')
  .post(requireAuth, VehicleRequests.makeVehicleRequest)
  .get(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.getVehicleRequests)

router.route('/vehicles')
  .get(requireAuth, Users.roleAuthorization(['OPO']), Vehicles.getVehicles)

router.route('/opoVehicleRequest/:id')
  .put(requireAuth, Users.roleAuthorization(['OPO']), VehicleRequests.respondToVehicleRequest)


export default router;
