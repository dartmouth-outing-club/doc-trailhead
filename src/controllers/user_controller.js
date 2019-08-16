import jwt from 'jwt-simple';
import dotenv from 'dotenv';
import User from '../models/user_model';
import Trip from '../models/trip_model';

dotenv.config({ silent: true });

export const signin = (req, res, next) => {
  User.findById(req.user.id).populate('leader_for').then((user) => {
    res.send({ token: tokenForUser(req.user), user: user });
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
    res.json(user);
  });
};

const isStringEmpty = (string) => {
  return string.length === 0 || !string.trim();
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
        const { dash_number, allergies_dietary_restrictions, medical_conditions, clothe_size, shoe_size, height } = req.body;
        if (!isStringEmpty(dash_number)) {
          user.dash_number = dash_number; 
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
          res.locals.leaderReq = true;
        } else {
          user.leader_for = req.body.leader_for;
        }
        if (req.body.leader_for.length === 0 && user.role !== 'OPO') {
          user.role = 'Trippee';
        }

        if ((!user.trailer_cert && req.body.trailer_cert)
          || ((req.body.driver_cert !== null) && (user.driver_cert !== req.body.driver_cert))) {
          user.has_pending_cert_change = true;
          res.locals.certReq = true;
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
        return user.save();
      })
      .then(() => {
        return User.findById(req.user.id).populate('leader_for');
      })
      .then((updatedUser) => {
        res.json(updatedUser);
        return [updatedUser, req.body];
      })
      // invoke middleware if approval is required
      .then((userAndReq) => {
        if (userAndReq[0].has_pending_leader_change || userAndReq[0].has_pending_cert_change) {
          res.locals.userAndReq = userAndReq;
          next();
        }
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
