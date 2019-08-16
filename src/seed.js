import mongoose from 'mongoose';
import Clubs from './models/club_model';
import Users from './models/user_model';
import Trips from './models/trip_model';
import LeaderApprovals from './models/leader_approval_model';
import CertApprovals from './models/cert_approval_model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true });
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

const fakeUsers = [
  {
    email: 'trippee@dartmouth.edu',
    password: '12345',
    name: 'Trippee',
    role: 'Trippee',
    leader_for: [],
    dash_number: '12345',
  },
  {
    email: 'opo@dartmouth.edu',
    password: '12345',
    name: 'OPO',
    role: 'OPO',
    leader_for: [],
    dash_number: '12345',
  },
  {
    email: 'leader@dartmouth.edu',
    password: '12345',
    name: 'Leader',
    role: 'Leader',
    leader_for: [],
    dash_number: '12345',
  }
]

const clubs = [
  {
    name: 'Mountaineering',
  },
  {
    name: 'Ledyard',
  },
  {
    name: 'Cabin and Trail',
  },
  {
    name: 'Bait and Bullet',
  },
  {
    name: 'Women in the Wilderness',
  },
  {
    name: 'Woodsmen',
  },
  {
    name: 'Surf Club',
  },
  {
    name: 'Mountain Biking',
  },
  {
    name: 'Winter Sports',
  },
  {
    name: 'Other',
  },
]



function seedDb() {
  CertApprovals.deleteMany({})
    .then(() => {
      LeaderApprovals.deleteMany({})
        .then(() => {
          Clubs.deleteMany({})
            .then(() => {
              Trips.deleteMany({})
                .then(() => {
                  Users.deleteMany({})
                    .then(() => {
                      Clubs.insertMany(clubs)
                        .then((clubs) => {
                          fakeUsers.map((fakeUser) => {
                            const newUser = new Users();
                            newUser.email = fakeUser.email;
                            newUser.password = fakeUser.password;
                            newUser.name = fakeUser.name;
                            newUser.role = fakeUser.role;
                            newUser.dash_number = fakeUser.dash_number;
                            if (fakeUser.role === 'Leader') {
                              let clubIds = [];
                              clubs.map((club) => {
                                clubIds.push(club._id);
                              });
                              newUser.leader_for = clubIds;
                            } else {
                              newUser.leader_for = fakeUser.leader_for;
                            }
                            newUser.save();
                          });
                        })
                        .then(() => {
                          console.log('seeded db. Press control+c to exit');
                          // process.exit();
                        })
                    })
                })
            })
        })
    })
    .catch((error) => {
      console.log(error);
    })
};

seedDb();
