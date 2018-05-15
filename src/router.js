import { Router } from 'express';
// import * as Trips from './controllers/trip_controller';
import * as Users from './controllers/user_controller';
import { /* requireAuth, */ requireSignin } from './services/passport';


const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'welcome to our doc app!' });
});
router.post('/signin', requireSignin, Users.signin);
router.post('/signup', Users.signup);
/*
router.route('/trips')
  .post(requireAuth, Trips.createTrip)
  .get(Trips.getTrips);

router.route('/trip/:id')
  .get(Trips.getTrip)
  .put(requireAuth, Trips.updateTrip)
  .delete(requireAuth, Trips.deleteTrip);
*/
// /your routes will go here

export default router;
