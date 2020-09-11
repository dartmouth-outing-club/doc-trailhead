import { Router } from 'express';
import { requireAuth } from '../services/passport';
import controllers from '../controllers';
import models from '../models';

const tripsRouter = Router();

tripsRouter.route('/')
  .post(requireAuth, (req, res) => {
    controllers.trips.createTrip(req.user, req.body).then((result) => {
      res.json(result);
    }).catch((error) => { return res.status(500).json(error); });
  })
  .get(requireAuth, async (req, res) => {
    const filters = {};
    if (req.query.club) {
      console.log(req.query.club);
      const club = await models.clubs.findOne({ name: req.query.club });
      if (club) filters.club = club.id;
      else res.status(404).json(new Error('No club found with that name'));
    }
    controllers.trips.getTrips(filters).then((result) => {
      res.json(result);
    }).catch((error) => { return res.status(500).json(error); });
  });

tripsRouter.route('/:tripID')
  .get(requireAuth, async (req, res) => {
    controllers.trips.getTrip(req.params.tripID, req.user)
      .then((result) => { res.json(result); })
      .catch((error) => { return res.status(500).json(error); });
  })
  .put(requireAuth, controllers.trips.updateTrip)
  .delete(requireAuth, controllers.trips.deleteTrip);

export default tripsRouter;
