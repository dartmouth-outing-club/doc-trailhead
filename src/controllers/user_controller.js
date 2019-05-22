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
      newUser.role = 'Trippee';
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

export const roleAuthorization = (roles) => {
  return function authorize(req, res, next) {
    const { user } = req;
    User.findById(user._id, (err, foundUser) => {
      if (err) {
        res.status(422).send('No user found.');
        return next(err);
      }
      if (roles.indexOf(foundUser.role) > -1) {
        return next();
      }
      res.status(401).send('You are not authorized to view this content');
      return next('Unauthorized');
    });
  };
};

export const joinTrip = (req, res) => {
  const { id, pend } = req.body;
  Trip.findById(id)
    .then((trip) => {
      if (!trip) {
        res.json({ trip: null, isUserOnTrip: false });
      } else if (trip.members.length >= trip.limit) {
        res.json({ trip, isUserOnTrip: false });
      } else {
        // add user to member list
        trip.members.push(pend);
        pend.gear.forEach((pendGear) => {
          trip.trippeeGear.forEach((gear) => {
            if (pendGear.gearId === gear.id) {
              gear.quantity += 1;
            }
          })
        });
        // remove user from pending list
        trip.pending.forEach((pender, index) => {
          if (String(pender.id) === String(pend._id)) {
            trip.pending.splice(index, 1);
          }
        });
        trip.save()
          .then(() => {
            Trip.findById(id).populate('leaders').populate({
              path: 'members.user',
              model: 'User',
            }).populate({
              path: 'pending.user',
              model: 'User',
            })
              .then((updatedTrip) => {
                res.json({ trip: updatedTrip, isUserOnTrip: true });
              });
          });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};

export const addToPending = (req, res) => {
  const { id } = req.body;
  const { trippeeGear } = req.body;
  Trip.findById(id)
    .then((trip) => {
      if (!trip) {
        res.json({ trip: null, isUserOnTrip: false });
      } else {
        trip.pending.push({ user: req.user._id, gear: trippeeGear });
        trip.save().then(() => {
          Trip.findById(id).populate('leaders').populate('pending').then((updatedTrip) => {
            res.json({ trip: updatedTrip, isUserOnTrip: false });
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
  Trip.find({ $or: [{ members: id }, { leaders: id }] }).populate('club')
    .then((trips) => { // this should see if name is in members
      res.json(trips);
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

export const isOnTrip = (req, res) => {
  const { id } = req.params;

  Trip.findById(id) // this should see if name is in members
    .then((trip) => {
      const isInArray = trip.members.some((member) => {
        return member.user.equals(req.user._id);
      });
      if (isInArray) {
        res.json({ isOnTrip: true });
      } else {
        res.json({ isOnTrip: false });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    })
};

export const getUser = (req, res) => {
  User.findById(req.user.id).populate('leader_for').then((user) => {
    res.json(cleanUser(user));
  });
};


export const leaveTrip = (req, res) => {
  Trip.findById(req.params.id).populate('leaders').populate({
    path: 'members.user',
    model: 'User',
  })
    .then((trip) => {
      if (!trip) {
        res.status(422).send('Trip doesn\'t exist');
      } else {
        trip.members.some((member, index) => {
          if (member.user._id.equals(req.user._id)) {
            member.gear.forEach((memberGear) => {
              trip.trippeeGear.forEach((gear) => {
                if (memberGear.gearId === gear.id) {
                  gear.quantity -= 1;
                }
              })
            });
            trip.members.splice(index, 1);
          }
          return member.user._id.equals(req.user._id);
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


export const updateUser = (req, res, next) => {
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
        if (!req.body.email.endsWith('@dartmouth.edu')) {
          throw new Error('You must have a Dartmouth email');
        }
        if (user.dash_number !== '' && req.body.dash_number === '') {
          throw new Error('You must have a dash number');
        }

        user.email = req.body.email;
        user.name = req.body.name;
        // Determine if approval is required
        if (user.role === 'Trippee' && req.body.leader_for.length > 0) {
          user.has_pending_changes = true;
        } else {
          user.leader_for = req.body.leader_for;
        }
        if (req.body.leader_for.length === 0) {
          user.role = 'Trippee';
        }

        if (req.body.role) {
          user.role = req.body.role;
        }
        user.dash_number = req.body.dash_number;
        return user.save();
      })
      .then(() => {
        return User.findById(req.user.id).populate('leader_for');
      })
      .then((updatedUser) => {
        res.json(cleanUser(updatedUser));
        return [updatedUser, req.body];
      })
      // invoke middleware if approval if required
      .then((userAndReq) => {
        if (userAndReq[0].role === 'Trippee' && userAndReq[1].leader_for.length > 0) {
          res.locals.userAndReq = userAndReq;
          next();
        }
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
      if (trip.leaders.indexOf(req.user._id) > -1) {
        leaderOf.push(trip);
      } else if (trip.members.indexOf(req.user._id) > -1) {
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
    role: user.role,
    leader_for: user.leader_for,
    dash_number: user.dash_number,
    has_pending_changes: user.has_pending_changes,
  };
}
