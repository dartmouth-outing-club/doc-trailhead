import jwt from 'jwt-simple';
import dotenv from 'dotenv';
import User from '../models/user_model';
import Trip from '../models/trip_model';

dotenv.config({ silent: true });

export const signin = (req, res, next) => {
  User.findById(req.user.id).populate('leader_for').then((user) => {
    res.send({ token: tokenForUser(req.user), user: cleanUser(user) });
  });
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
          res.send({ token: tokenForUser(result), user: cleanUser(result) });
        })
        .catch((error) => {
          res.status(500).send(error.message);
        });
    }
  });
};

export const joinTrip = (req, res) => {
  const { id } = req.body;
  Trip.findById(id)
    .then((trip) => {
      if (!trip) {
        res.json({ trip: null, isUserOnTrip: false });
      } else if (trip.members.length >= trip.limit) {
        res.json({ trip, isUserOnTrip: false });
      } else {
        trip.members.push(req.user._id);
        trip.save().then(() => {
          Trip.findById(id).populate('leaders').populate('members').then((updatedTrip) => {
            res.json({ trip: updatedTrip, isUserOnTrip: true });
          });
        });
      }
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};


export const myTrips = (req, res) => {
  const id = req.user._id;
  Trip.find({ members: id }).populate('club')
    .then((trips) => { // this should see if name is in members
      res.json(trips);
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

export const isOnTrip = (req, res) => {
  const { id } = req.params;
  Trip.findById(id, (err, trip) => { // this should see if name is in members
    const isInArray = trip.members.some((member) => {
      return member.equals(req.user._id);
    });
    if (isInArray) {
      res.json({ isOnTrip: true });
    } else {
      res.json({ isOnTrip: false });
    }
  });
};

export const getUser = (req, res) => {
  User.findById(req.user.id).populate('leader_for').then((user) => {
    res.json(cleanUser(user));
  });
};


export const leaveTrip = (req, res) => {
  Trip.findById(req.params.id).populate('leaders').populate('members')
    .then((trip) => {
      if (!trip) {
        res.status(422).send('Trip doesn\'t exist');
      } else {
        trip.members.forEach((member, index) => {
          if (member.id === req.user.id) {
            trip.members.splice(index, 1);
          }
        });
        return trip.save();
      }
    })
    .then((trip) => {
      res.json({ trip, isUserOnTrip: false });
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};


export const updateUser = (req, res) => {
  User.findById(req.user.id, (err, user) => { // this should see if name is in member
    User.find({ email: req.body.email })
      .then((existingUser) => {
        if (existingUser[0] && existingUser[0].id !== req.user.id) {
          throw new Error('This email already exists in the database.');
        }

        return existingUser;
      })
      .then(() => {
        if (!req.body.name) {
          throw new Error('You must have a name');
        }
        if (!req.body.email) {
          throw new Error('You must have an email');
        }
        if (user.dash_number !== '' && req.body.dash_number === '') {
          throw new Error('You must have a dash number');
        }

        user.email = req.body.email;
        user.name = req.body.name;
        if (req.body.leader_for && req.body.leader_for.length > 0) {
          user.leader_for = req.body.leader_for;
          user.is_leader = true;
        }
        user.dash_number = req.body.dash_number;
        return user.save();
      })
      .then(() => {
        return User.findById(req.user.id).populate('leader_for');
      })
      .then((updatedUser) => {
        res.json(cleanUser(updatedUser));
      })
      .catch((error) => {
        res.status(406).send(error.message);
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
    id: user.id,
    email: user.email,
    name: user.name,
    is_leader: user.is_leader,
    leader_for: user.leader_for,
    dash_number: user.dash_number,
  };
}
