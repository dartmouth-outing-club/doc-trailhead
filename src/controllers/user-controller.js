import jwt from 'jwt-simple';
// import dotenv from 'dotenv';
import passport from '../services/passport';
import * as constants from '../constants';
import User from '../models/user-model';
import Trip from '../models/trip-model';
import VehicleRequest from '../models/vehicle-request-model';

// dotenv.config({ silent: true });

export const signinSimple = (req, res, next) => {
  passport.authenticate('local', (err, user) => {
    if (err) { return err; }
    if (!user) {
      res.status(500).send('rejected');
    } else {
      User.findById(user.id).populate('leader_for').exec()
        .then((foundUser) => {
          res.json({ token: tokenForUser(foundUser, 'normal'), user: foundUser });
        })
        .catch((error) => {
          res.status(500).send(error.message);
        });
    }
  })(req, res, next);
};

export const signinCAS = (req, res, next) => {
  passport.authenticate('cas', (error, user) => {
    if (error) { return error; }
    if (!user) {
      res.redirect(constants.frontendURL);
    }
    User.find({ casID: user }).populate('leader_for').exec()
      .then((userFromDB) => {
        if (userFromDB.length === 0) {
          const newUser = new User();
          newUser.casID = user;
          newUser.completedProfile = false;
          newUser.save()
            .then((savedUser) => {
              console.log('cas new user', savedUser);
              res.redirect(`${constants.frontendURL}?token=${tokenForUser(savedUser, 'normal')}&userId=${savedUser.id}&new?=yes`);
            });
        } else {
          console.log('cas user', userFromDB[0]);
          res.redirect(`${constants.frontendURL}?token=${tokenForUser(userFromDB[0], 'normal')}&userId=${userFromDB[0].id}&new?=${userFromDB[0]}.casID`);
        }
      })
      .catch((errorInFindingUser) => {
        res.status(500).send(errorInFindingUser.message);
      });
  })(req, res, next);
};

// how to route to signup instead?
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
          res.send({ token: tokenForUser(result, 'normal'), user: result });
        })
        .catch((error) => {
          res.status(500).send(error.message);
        });
      if (!email || !name) {
        res.status(422).send('You must provide a name, email and password');
      }
      User.findById(req.body.id, (err, user1) => {
        user1.email = email;
        user1.name = name;
        user1.role = 'Trippee';
        user1.leader_for = [];
        user1.save()
          .then((result) => {
            res.send({ user: cleanUser(result) });
          })
          .catch((error) => {
            res.status(500).send(error.message);
          });
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

export const myTrips = (req, res) => {
  const id = req.user._id;
  Trip.find({ $or: [{ 'members.user': id }, { 'pending.user': id }, { leaders: id }] })
    .populate('club').populate('leaders').populate('vehicleRequest')
    .populate({
      path: 'members.user',
      model: 'User',
    })
    .populate({
      path: 'pending.user',
      model: 'User',
    })
    .populate({
      path: 'vehicleRequest',
      populate: {
        path: 'assignments',
        model: 'Assignment',
      },
    })
    .populate({
      path: 'vehicleRequest',
      populate: {
        path: 'assignments',
        populate: {
          path: 'assigned_vehicle',
          model: 'Vehicle',
        },
      },
    })
    .then((trips) => {
      VehicleRequest.find({ requester: id }).populate('associatedTrip')
        .then((vehicleRequests) => {
          res.json({ trips, vehicleRequests });
        });
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

const isStringEmpty = (string) => {
  return (!string || string.length === 0);
};

const isInfoEmpty = (string) => {
  return !string || string.length === 0 || !string.toString().trim();
};

export const getUser = (req, res) => {
  User.findById(req.user.id).populate('leader_for').populate('requested_clubs').exec()
    .then((user) => {
      let hasCompleteProfile = true;
      if (!user.email || !user.name || !user.pronoun || !user.dash_number || !user.allergies_dietary_restrictions
        || !user.medical_conditions || !user.clothe_size || !user.shoe_size || !user.height
        || isInfoEmpty(user.email) || isInfoEmpty(user.name) || isInfoEmpty(user.pronoun) || isInfoEmpty(user.dash_number)
        || isInfoEmpty(user.allergies_dietary_restrictions) || isInfoEmpty(user.medical_conditions)
        || isInfoEmpty(user.clothe_size) || isInfoEmpty(user.height)) {
        hasCompleteProfile = false;
      }
      res.json({ user, hasCompleteProfile });
    })
    .catch((error) => {
      console.log(error);
      res.status(406).send(error.message);
    });
};

/**
 * Returns all users in the database void of the requester.
 * @param {*} req
 * @param {*} res
 */
export const getUsers = (req, res) => {
  User.find({}).then((foundUsers) => {
    res.send(foundUsers.filter((user) => {
      return !user._id.equals(req.user._id);
    }));
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
        const {
          pronoun, dash_number, allergies_dietary_restrictions, medical_conditions, clothe_size, shoe_size, height, photo_url,
        } = req.body;
        if (!isStringEmpty(photo_url)) {
          user.photo_url = photo_url;
        }
        if (!isStringEmpty(dash_number)) {
          user.dash_number = dash_number;
        }
        if (!isStringEmpty(pronoun)) {
          user.pronoun = pronoun;
        }
        if (!isStringEmpty(allergies_dietary_restrictions)) {
          user.allergies_dietary_restrictions = allergies_dietary_restrictions;
        }
        if (!isStringEmpty(medical_conditions)) {
          user.medical_conditions = medical_conditions;
        }
        if (!isStringEmpty(clothe_size)) {
          user.clothe_size = clothe_size;
        }
        if (!isStringEmpty(shoe_size)) {
          user.shoe_size = shoe_size;
        }
        if (!isStringEmpty(height)) {
          user.height = height;
        }

        // Determine if approval is required. Approval is not required if user drops club.
        if (req.body.leader_for.length > user.leader_for.length) {
          user.has_pending_leader_change = true;
          user.requested_clubs = req.body.leader_for;
          // res.locals.leaderReq = true;
        } else {
          user.leader_for = req.body.leader_for;
          user.has_pending_leader_change = false;
          user.requested_clubs = [];
        }
        if (req.body.leader_for.length === 0 && user.role !== 'OPO') {
          user.role = 'Trippee';
        }

        if ((!user.trailer_cert && req.body.trailer_cert)
          || ((req.body.driver_cert !== null) && (user.driver_cert !== req.body.driver_cert))) {
          user.has_pending_cert_change = true;
          const requestedCerts = {};
          requestedCerts.driver_cert = req.body.driver_cert;
          requestedCerts.trailer_cert = req.body.trailer_cert;
          user.requested_certs = requestedCerts;
          // res.locals.certReq = true;
        } else {
          user.has_pending_cert_change = false;
          user.requested_certs = {};
        }

        if (!req.body.trailer_cert) {
          user.trailer_cert = req.body.trailer_cert;
        }
        if (req.body.driver_cert === null) {
          user.driver_cert = req.body.driver_cert;
        }

        if (req.body.role) {
          user.role = req.body.role;
        }

        user.save()
          .then(() => {
            getUser(req, res);
          });
      })
      .catch((error) => {
        console.log(error);
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

export const getLeaderRequests = (req, res) => {
  User.find({ has_pending_leader_change: true }).populate('leader_for').populate('requested_clubs').exec()
    .then((users) => {
      return res.json(users);
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};

export const respondToLeaderRequest = (req, res) => {
  User.findById(req.body.userId).populate('leader_for').populate('requested_clubs').exec()
    .then((user) => {
      if (req.body.status === 'approved') {
        if (user.role !== 'OPO') {
          user.role = 'Leader';
        }
        user.leader_for = user.requested_clubs;
        user.requested_clubs = [];
        user.has_pending_leader_change = false;
        user.save()
          .then(() => {
            getLeaderRequests(req, res);
          });
      } else {
        user.has_pending_leader_change = false;
        user.requested_clubs = [];
        user.save()
          .then(() => {
            getLeaderRequests(req, res);
          });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};

export const getCertRequests = (req, res) => {
  User.find({ has_pending_cert_change: true }).populate('leader_for').populate('requested_clubs').exec()
    .then((users) => {
      return res.json(users);
    });
};

export const respondToCertRequest = (req, res) => {
  User.findById(req.body.userId).populate('leader_for').populate('requested_clubs').exec()
    .then((user) => {
      if (req.body.status === 'approved') {
        user.driver_cert = user.requested_certs.driver_cert;
        user.trailer_cert = user.requested_certs.trailer_cert;
        user.requested_certs = {};
        user.has_pending_cert_change = false;
        user.save()
          .then(() => {
            getCertRequests(req, res);
          });
      } else {
        user.has_pending_cert_change = false;
        user.requested_certs = {};
        user.save()
          .then(() => {
            getCertRequests(req, res);
          });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};

export function tokenForUser(user, purpose, tripID) {
  const timestamp = new Date().getTime();
  return jwt.encode({
    sub: user.id, iat: timestamp, purpose, tripID,
  }, process.env.AUTH_SECRET);
}

function cleanUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    pronoun: user.pronoun,
    role: user.role,
    leader_for: user.leader_for,
    dash_number: user.dash_number,
    allergies_dietary_restrictions: user.allergies_dietary_restrictions,
    medical_conditions: user.medical_conditions,
    clothe_size: user.clothe_size,
    height: user.height,
    has_pending_leader_change: user.has_pending_change,
    has_pending_cert_change: user.has_pending_cert_change,
    driver_cert: user.driver_cert,
    trailer_cert: user.trailer_cert,
  };
}
