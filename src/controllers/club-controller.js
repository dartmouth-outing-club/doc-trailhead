import Club from '../models/club-model';

export const createClub = (req, res) => {
  const club = new Club();
  club.name = req.body.name;
  club.save()
    .then(() => {
      res.json({ message: 'Club Created' });
    })
    .catch((error) => {
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
