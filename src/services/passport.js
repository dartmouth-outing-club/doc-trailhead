import passport from 'passport';
import LocalStrategy from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import cas from 'passport-cas';
import dotenv from 'dotenv';
import User from '../models/user_model';

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
      done(null, user);
    } else {
      done(null, false);
    }
  });
});

// dartmouth web auth

const casOptions = {
  ssoBaseURL: 'https://login.dartmouth.edu/cas',
  // serverBaseURL: "http://dalidocplanner.surge.sh/cas"
  // serverBaseURL: 'https://doc-planner.herokuapp.com/api/signin',
  serverBaseURL: 'http://localhost:9090/api',
};
const casLogin = new cas.Strategy(casOptions, (user, done) => {
  return done(null, user);
});


// Tell passport to use this strategy
passport.use(casLogin);
passport.use(jwtLogin);
passport.use(localLogin);


export const requireAuth = passport.authenticate('jwt', { session: false });
export const requireSignin = passport.authenticate('local', { session: false });
export const requireCAS = passport.authenticate('cas', { session: false });
export default passport;
