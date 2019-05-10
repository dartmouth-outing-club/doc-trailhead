import Trip from '../models/trip_model';
import User from '../models/user_model';
import Club from '../models/club_model';

export const createTrip = (req, res) => {
  console.log('creating trip from api');
  const trip = new Trip();
  trip.startDate = req.body.startDate;
  trip.endDate = req.body.endDate;
  trip.startTime = req.body.startTime;
  trip.endTime = req.body.endTime;
  trip.title = req.body.title;
  trip.description = req.body.description;
  trip.club = req.body.club;
  trip.cost = req.body.cost;
  trip.experienceNeeded = req.body.experienceNeeded;
  trip.location = req.body.location;
  trip.mileage = req.body.mileage;
  trip.OPOGearRequests = req.body.gearRequests;
  if (req.body.gearRequests.length > 0) {
    trip.gearStatus = 'pending';
  }
  trip.members = [];
  trip.leaders = [];
  trip.pending = [];
  trip.leaders.push(req.user._id);
  User.find({ email: { $in: req.body.leaders } })
    .then((users) => {
      users.forEach((user) => {
        trip.leaders.push(user._id);
      });
    })
    .then(() => {
      return trip.save()
        .then((savedTrip) => {
          res.json({ message: 'Trip created' });
          return savedTrip;
        });
    })
    .catch((error) => {
      console.log(error);
    });
};

export const getTrips = (req, res) => {
  console.log('TRYING TO get trips');
  Trip.find()
    .then((trips) => {
      res.json(trips);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const getTrip = (req, res) => {
  Trip.findById(req.params.id).populate('leaders').populate('members').populate('pending')
    .then((trip) => {
      res.json({ trip });
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const deleteTrip = (req, res) => {
  Trip.findById(req.params.id, (err, trip) => {
    if (err) {
      res.json({ error: err });
    } else if (trip.leaders.indexOf(req.user._id) > -1) {
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
    } else if (trip.leaders.indexOf(req.user._id) !== -1) {
      trip.startDate = req.body.startDate;
      trip.endDate = req.body.endDate;
      trip.startTime = req.body.startTime;
      trip.endTime = req.body.endTime;
      trip.title = req.body.title;
      trip.description = req.body.description;
      trip.mileage = req.body.mileage;
      trip.location = req.body.location;
      trip.cost = req.body.cost;
      trip.experienceNeeded = req.body.experienceNeeded;
      trip.OPOGearRequests = req.body.gearRequests;
      if (req.body.newRequest) {
        trip.gearStatus = 'pending';
      }

      trip.save()
        .then((result) => {
          res.json({ message: 'Trip created' });
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

export const getGearRequests = (req, res) => {
  Trip.find({ gearStatus: { $not: { $in: ['N/A'] } } }).populate('leaders').populate('club')
    .then((gearRequests) => {
      res.json(gearRequests);
    });
};

export const respondToGearRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.gearStatus = req.body.status;
      trip.save().then(getGearRequests(req, res));
    }).catch((error) => {
      res.status(500).send(error);
    });
};
