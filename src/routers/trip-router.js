import { Router } from 'express';
import { requireAuth } from '../services/passport';
import controllers from '../controllers';

const tripsRouter = Router();

tripsRouter.route('/')
  .post(requireAuth, (req, res) => {
    controllers.trips.createTrip(req.user, req.body).then((result) => {
      res.json(result);
    }).catch((error) => { return res.status(500).json(error); });
  })
  .get(requireAuth, (req, res) => {
    controllers.trips.getTrips().then((result) => {
      res.json(result);
    }).catch((error) => { return res.status(500).json(error); });
  });

export default tripsRouter;
