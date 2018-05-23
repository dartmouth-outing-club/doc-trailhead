/* import Trip from '../models/trip_model';
import User from '../models/user_model'; */
import Club from '../models/club_model';

export const createClub = (req, res) => {
  const club = new Club();
  club.name = req.body.name;
  club.save()
    .then((result) => {
      res.json({ message: 'Club Created' });
    }).catch((error) => {
      res.status(500).json({ error });
    });
};

export const allClubs = (req, res) => {
  Club.find({}, (err, clubs) => {
    if (err) {
      res.json(err);
    } else {
      res.json(clubs);
    }
  });
};
