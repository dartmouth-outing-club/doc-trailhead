import jwt from 'jwt-simple';
import dotenv from 'dotenv';
import User from '../models/user_model';
import Trip from '../models/trip_model';

dotenv.config({ silent: true });

export const signin = (req, res, next) => {
  res.send({ token: tokenForUser(req.user) });
};

export const signup = (req, res, next) => {
  const { email } = req.body;
  const { password } = req.body;
  const { name } = req.body;
  if (!email || !password || !name) {
    res.status(422).send('You must provide a name, email and password');
  }
  User.findOne({ email }, (err, user) => {
    if (user) {
      res.status(422).send('User already exists');
    } else {
      const newUser = new User();
      newUser.email = email;
      newUser.password = password;
      newUser.name = name;
      newUser.is_leader = false;
      newUser.leader_for = [];
      newUser.save()
        .then((result) => {
          res.send({ token: tokenForUser(newUser) });
        })
        .catch((error) => {
          res.status(500).json({ error });
        });
    }
  });
};

export const joinTrip = (req, res) => {
  const { id } = req.body;
  Trip.findById(id, (err, trip) => {
    if (!trip) {
      res.json({ trip: false, added: false });
    } else if (!req.user) {
      res.status(422).send('You must be logged in');
    } else if (trip.members.length >= trip.limit) {
      res.json({ trip, added: false });
    } else {
      trip.members.push(req.user._id);
      trip.save().then((result) => {
        res.json(res.json({ trip: result, added: true }));
      }).catch((error) => {
        res.status(500).json({ error });
      });
    }
  });
};


export const myTrips = (req, res) => {
  const id = req.user._id;
  Trip.find({ members: id }, (err, trips) => { // this should see if name is in members
    res.json(trips);
  });
};

export const isOnTrip = (req, res) => {
  const { id } = req.params;
  Trip.findById(id, (err, trip) => { // this should see if name is in members
    if (trip.members.includes(req.user._id)) {
      res.json({ isOnTrip: true });
    } else {
      res.json({ isOnTrip: false });
    }
  });
};

export const getUser = (req, res) => {
  res.json(cleanUser(req.user));
};


export const leaveTrip = (req, res) => {
  Trip.findById(req.body.id, (err, trip) => {
    if (!trip) {
      res.status(422).send('Trip doesn\'t exist');
    } else {
      const index = trip.members.indexOf(req.user._id);
      if (index > -1) {
        trip.members = trip.members.splice(index, 1);
        trip.save()
          .then((result) => {
            res.json({ message: 'Removed from trip' });
          }).catch((error) => {
            res.status(500).json({ error });
          });
      }
    }
  });
};


export const updateUser = (req, res) => {
  User.findById(req.user.id, (err, user) => { // this should see if name is in members
    user.email = req.body.email;
    user.name = req.body.name;
    if (req.body.leader_for) {
      user.leader_for = user.leader_for.concat(req.body.leader_for);
      user.is_leader = true;
    }
    user.dash_number = req.body.dash_number;
    user.save().then((updatedUser) => {
      res.json(cleanUser(updatedUser));
    });
  });
};

export const userTrips = (req, res) => {
  Trip.find({}, (err, trips) => {
    const leaderOf = [];
    const memberOf = [];
    trips.forEach((trip) => {
      if (trip.leaders.includes(req.user._id)) {
        leaderOf.push(trip);
      } else if (trip.members.includes(req.user._id)) {
        memberOf.push(trip);
      }
    });
    res.json({ leaderOf, memberOf });
  });
};


function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, process.env.AUTH_SECRET);
}

function cleanUser(user) {
  return {
    email: user.email,
    name: user.name,
    is_leader: user.is_leader,
    leader_for: user.leader_for,
    dash_number: user.dash_number,
  };
}
