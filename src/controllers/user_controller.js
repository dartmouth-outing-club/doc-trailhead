import jwt from 'jwt-simple';
import dotenv from 'dotenv';
import User from '../models/user_model';
import Trip from '../models/trip_model';

dotenv.config({ silent: true });

// and then the secret is usable this way:
// process.env.AUTH_SECRET;


export const signin = (req, res, next) => {
  res.send({ token: tokenForUser(req.user) });
};

export const signup = (req, res, next) => {
  const { email } = req.body;
  const { password } = req.body;
  const { name } = req.body;
  console.log(email);
  if (!email || !password) {
    res.status(422).send('You must provide email and password');
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
        }).catch((error) => {
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


function tokenForUser(user) {
  const timestamp = new Date().getTime();
  return jwt.encode({ sub: user.id, iat: timestamp }, process.env.AUTH_SECRET);
}
