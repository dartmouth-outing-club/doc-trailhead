import passport from 'passport';
import LocalStrategy from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import cas from 'passport-cas';
import dotenv from 'dotenv';
import { add } from 'date-arithmetic';
import * as constants from '../constants';
import User from '../models/user-model';
import Trip from '../models/trip-model';


dotenv.config({ silent: true });

const localOptions = { usernameField: 'email' };

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromHeader('authorization'),
  secretOrKey: process.env.AUTH_SECRET,
};

const localLogin = new LocalStrategy(localOptions, (email, password, done) => {
  User.findOne({ email }, ['username', 'password'], (err, user) => {
    if (err) {
      return done(err);
    } else if (!user) {
      return done(null, false);
    }

    user.comparePassword(password, (err, isMatch) => {
      if (err) {
        done(err);
      } else if (!isMatch) {
        done(null, false);
      } else {
        done(null, user);
      }
    });
  });
});

const jwtLogin = new JwtStrategy(jwtOptions, (payload, done) => {
  User.findById(payload.sub, (err, user) => {
    if (err) {
      done(err, false);
    } else if (user) {
      if (payload.purpose === 'mobile') {
        console.log('token time', payload.iat);
        console.log(payload);
        Trip.findById(payload.tripID).then((trip) => {
          const today = new Date();

          if (today.getTime() <= add(trip.endDateAndTime, 24, 'hours').getTime()) {
            console.log('token is valid');
            done(null, user);
          } else {
            done(err, false);
            console.log('token expired');
          }
        });
      } else {
        done(null, user);
      }
    } else {
      done(null, false);
    }
  });
});

const casOptions = {
  ssoBaseURL: 'https://login.dartmouth.edu/cas',
  serverBaseURL: `${constants.backendURL}/signin-cas`,
};
const casLogin = new cas.Strategy(casOptions, (user, done) => {
  return done(null, user);
});

passport.use(casLogin);
passport.use(jwtLogin);
passport.use(localLogin);

export const requireAuth = passport.authenticate('jwt', { session: false });
export const requireSignin = passport.authenticate('local', { session: false });
export const requireCAS = passport.authenticate('cas', { session: false });
export default passport;
