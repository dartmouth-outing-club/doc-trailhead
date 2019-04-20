import { Router } from 'express';
import * as Trips from './controllers/trip_controller';
import * as Users from './controllers/user_controller';
import sendEmailToTrip from './controllers/email_controller';
import * as Clubs from './controllers/club_controller';
import { requireAuth, requireSignin } from './services/passport';


const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' });
});

router.post('/signin', requireSignin, Users.signin);
router.post('/signup', Users.signup);

router.route('/alltrips')
  .post(requireAuth, Users.roleAuthorization(['leader']), Trips.createTrip)
  .get(Trips.getTrips);

router.get('/trips/:club', Trips.getTripsByClub);

router.route('/trip/:id')
  .get(Trips.getTrip)
  .put(requireAuth, Trips.updateTrip)
  .delete(requireAuth, Trips.deleteTrip);

router.put('/jointrip', requireAuth, Users.joinTrip);

router.put('/addpending', requireAuth, Users.addToPending);


router.route('/user')
  .get(requireAuth, Users.getUser)
  .put(requireAuth, Users.updateUser);

router.get('/myTrips', requireAuth, Users.myTrips);
router.get('/isOnTrip/:id', requireAuth, Users.isOnTrip);
router.delete('/leaveTrip/:id', requireAuth, Users.leaveTrip);
router.get('/userTrips', requireAuth, Users.userTrips);

router.post('/sendEmailToTrip', sendEmailToTrip);

router.route('/club')
  .post(Clubs.createClub)
  .get(Clubs.allClubs);

export default router;
