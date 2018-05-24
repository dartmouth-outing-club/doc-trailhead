import Trip from '../models/trip_model';
import User from '../models/user_model';
import Club from '../models/club_model';

export const createTrip = (req, res) => {
  const trip = new Trip();
  trip.startDate = req.body.startDate;
  trip.endDate = req.body.endDate;
  trip.title = req.body.title;
  trip.description = req.body.description;
  trip.cost = req.body.cost;
  trip.limit = req.body.limit;
  trip.members = [];
  trip.leaders = [];
  trip.leaders.push(req.user._id);
  User.find({ email: { $in: req.body.leaders } }, (err, users) => {
    console.log(users);
    users.forEach((user) => {
      trip.leaders.push(user._id);
    });
    Club.findOne({ name: req.body.club }, (err, club) => {
      if (club) {
        trip.club = club._id;
      }
      trip.save()
        .then((result) => {
          res.json({ message: 'Trip created!' });
        }).catch((error) => {
          res.status(500).json({ error });
        });
    });
  });
};

export const getTrips = (req, res) => {
  Trip.find({}, (err, trips) => {
    if (err) {
      res.json({ error: err });
    } else {
      res.json(trips);
    }
  });
};

export const getTrip = (req, res) => {
  Trip.findById(req.params.id).populate('leaders').populate('members')
    .then((trip) => {
      Club.findOne({ name: req.body.club }, (err, club) => {
        res.json({ trip, members: trip.members, club });
      });
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const deleteTrip = (req, res) => {
  Trip.findById(req.params.id, (err, trip) => {
    if (err) {
      res.json({ error: err });
    } else if (trip.leaders.includes(req.user._id)) {
      Trip.remove({ _id: req.params.id }, (err) => {
        if (err) {
          res.json({ error: err });
        } else {
          res.json({ message: 'removed successfully' });
        }
      });
    } else {
      res.status(422).send('You must be a leader on the trip');
    }
  });
};

export const updateTrip = (req, res) => {
  Trip.findById(req.params.id, (err, trip) => {
    if (err) {
      res.json({ error: err });
    } else if (trip.leaders.includes(req.user._id)) {
      trip.date = req.body.date;
      trip.title = req.body.title;
      trip.description = req.body.description;
      trip.cost = req.body.cost;
      trip.limit = req.body.limit;
      User.find({ email: { $in: req.body.leaders } }, (err, users) => {
        console.log(users);
        users.forEach((user) => {
          trip.leaders.push(user._id);
        });
        Club.findOne({ name: req.body.club }, (err, club) => {
          if (club) {
            trip.club = club._id;
          }
          trip.save()
            .then((result) => {
              res.json({ message: 'Trip updated!' });
            }).catch((error) => {
              res.status(500).json({ error });
            });
        });
      });
    } else {
      res.status(422).send('You must be a leader on the trip');
    }
  });
};

export const getTripsByClub = (req, res) => {
  const { club } = req.params;
  Club.findOne({ name: club }, (err, theClub) => {
    if (!theClub) {
      res.json({ error: 'no club' });
    } else {
      const id = theClub._id;
      Trip.find({ club: id }, (err, trips) => {
        if (err) {
          res.json({ error: err });
        } else {
          res.json(trips);
        }
      });
    }
  });
};
