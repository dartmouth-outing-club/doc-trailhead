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
    if (req.user) {
      trip.members.push(req.user.email);
      trip.save().then((result) => {
        res.json(result);
      }).catch((error) => {
        res.status(500).json({ error });
      });
    } else {
      res.status(422).send('You must be logged in');
    }
  });
};


export const myTrips = (req, res) => {
  const { name } = req.user;
  Trip.find({ members: name }, (err, trips) => { // this should see if name is in members
    res.json(trips);
  });
};

export const isOnTrip = (req, res) => {
  const { id } = req.params;
  Trip.findById(id, (err, trip) => { // this should see if name is in members
    if (trip.members.includes(req.user.name)) {
      res.json({ isOnTrip: true });
    } else {
      res.json({ isOnTrip: false });
    }
  });
};


export const updateUser = (req, res) => {
  const { id } = req.user;
  User.findById(id, (err, user) => { // this should see if name is in members
    user.email = req.body.email;
    user.name = req.body.name;
    if(req.body.club{
      user.leader_for.push(req.body.club);
      user.is_leader = false;
    }
    user.dash_number = req.body.dash_number;

  });
};


function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, process.env.AUTH_SECRET);
}
