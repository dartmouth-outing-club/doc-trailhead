import mongoose from 'mongoose';
import Clubs from './models/club-model';
import Users from './models/user-model';
import Trips from './models/trip-model';
import Vehicles from './models/vehicle-model';
import VehicleRequests from './models/vehicle-request-model';
import Assignmnets from './models/assignment-model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true });
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

const fakeUsers = [
  {
    casID: null,
    email: 'opo@dartmouth.edu',
    password: 'opo',
    name: 'OPO Person',
    role: 'OPO',
    leader_for: [],
    dash_number: '2222',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: 'MICROBUS',
    trailer_cert: true,
  },
  {
    casID: null,
    email: 'leader@dartmouth.edu',
    password: 'leader',
    name: 'Trip Leader',
    role: 'Leader',
    leader_for: [],
    dash_number: '2222',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: 'MICROBUS',
    trailer_cert: true,
  },
  {
    casID: null,
    email: 'trippee1@dartmouth.edu',
    password: 'trippee1',
    name: 'Trippee 1',
    role: 'Trippee',
    leader_for: [],
    dash_number: '1111',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: 'MICROBUS',
    trailer_cert: true,
  },
  {
    casID: null,
    email: 'trippee2@dartmouth.edu',
    password: 'trippee2',
    name: 'Trippee 2',
    role: 'Trippee',
    leader_for: [],
    dash_number: '2222',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: 'VAN',
    trailer_cert: false,
  },
  {
    casID: null,
    email: 'trippee3@dartmouth.edu',
    password: 'trippee3',
    name: 'Trippee 3',
    role: 'Trippee',
    leader_for: [],
    dash_number: '3333',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: true,
  },
  {
    casID: 'Emma P. Rafkin@DARTMOUTH.EDU',
    email: 'Emma.P.Rafkin.21@darmouth.edu',
    password: 'test',
    name: 'Emma',
    role: 'Leader',
    leader_for: [],
    dash_number: '1111',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Chikezie Onungwa@DARTMOUTH.EDU',
    email: 'chikezie.onungwa.21@dartmouth.edu',
    password: 'test',
    name: 'Prosper!',
    role: 'Leader',
    leader_for: [],
    dash_number: '2222',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  // ACTUAL OPO OFFICE ACCOUNTS DONT DELETE
  {
    casID: 'Julie C. Bell@DARTMOUTH.EDU',
    email: 'julie.c.bell@dartmouth.edu',
    password: '',
    name: 'Julie Bell',
    role: 'OPO',
    leader_for: [],
    dash_number: '',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Kathleen Decato@DARTMOUTH.EDU',
    email: 'kathleen.decato@dartmouth.edu',
    password: '',
    name: 'Kathleen Decato',
    role: 'OPO',
    leader_for: [],
    dash_number: '',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Rory C. Gawler@DARTMOUTH.EDU',
    email: 'rory.c.gawler@dartmouth.edu',
    password: '',
    name: 'Rory Gawler',
    role: 'OPO',
    leader_for: [],
    dash_number: '',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Michael Silverman@DARTMOUTH.EDU',
    email: 'michael.silverman@dartmouth.edu',
    password: '',
    name: 'Mike Silverman',
    role: 'OPO',
    leader_for: [],
    dash_number: '',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Willow Nilsen@DARTMOUTH.EDU',
    email: 'willow.nilsen@dartmouth.edu',
    password: '',
    name: 'Willow Nilsen',
    role: 'OPO',
    leader_for: [],
    dash_number: '',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Gunnar W. Johnson@DARTMOUTH.EDU',
    email: 'gunnar.w.johnson@dartmouth.edu',
    password: '',
    name: 'Willow Nilsen',
    role: 'OPO',
    leader_for: [],
    dash_number: '',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Ashley Y. Song@DARTMOUTH.EDU',
    email: 'ashley.y.song.21@dartmouth.edu',
    password: '',
    name: 'Ashley Song',
    role: 'OPO',
    leader_for: [],
    dash_number: 'f00321n',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  {
    casID: 'Hyun Jo Park @DARTMOUTH.EDU',
    email: 'hyun.jo.park.20@dartmouth.edu',
    password: '',
    name: 'Hyunjo Park',
    role: 'Leader',
    leader_for: [],
    dash_number: 'f002qwc',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
];

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
    name: 'Alpine Club Ski Team',
  },
  {
    name: 'Archery Club',
  },
  {
    name: 'Biathalon Club',
  },
  {
    name: 'Climbing Team',
  },
  {
    name: 'Environmental Stewardship',
  },
  {
    name: 'Farm Club',
  },
  {
    name: 'Graduate Outing Club',
  },
  {
    name: 'Nordic Club Ski Team',
  },
  {
    name: 'People of Color Outdoors',
  },
  {
    name: 'Snowboard Club',
  },
  {
    name: 'Other',
  },
];

const vehicles = [
  {
    name: 'Van A',
    type: 'Van',
  },
  {
    name: 'Van D',
    type: 'Van',
  },
  {
    name: 'Van E',
    type: 'Van',
  },
  {
    name: 'Van F',
    type: 'Van',
  },
  {
    name: 'Van G',
    type: 'Van',
  },
  {
    name: 'Bus B',
    type: 'Microbus',
  },
  {
    name: 'Bus C',
    type: 'Microbus',
  },
  {
    name: 'State Truck',
    type: 'Truck',
  },
  {
    name: 'Red Truck',
    type: 'Truck',
  },
  {
    name: 'Minivan',
    type: 'Van',
  },
  {
    name: 'Van 100',
    type: 'Van',
  },
  {
    name: 'Van 101',
    type: 'Van',
  },
  {
    name: 'Enterprise',
    type: 'Enterprise',
  },
];

function seedDB() {
  VehicleRequests.deleteMany({})
    .then(() => {
      Assignmnets.deleteMany({})
        .then(() => {
          Vehicles.deleteMany({})
            .then(() => {
              Clubs.deleteMany({})
                .then(() => {
                  Trips.deleteMany({})
                    .then(() => {
                      Users.deleteMany({})
                        .then(() => {
                          Users.deleteMany({})
                            .then(() => {
                              Vehicles.insertMany(vehicles)
                                .then(() => {
                                  Clubs.insertMany(clubs)
                                    .then((insertedClubs) => {
                                      fakeUsers.forEach((fakeUser) => {
                                        const newUser = new Users();
                                        newUser.casID = fakeUser.casID;
                                        newUser.email = fakeUser.email;
                                        newUser.password = fakeUser.password;
                                        newUser.name = fakeUser.name;
                                        newUser.role = fakeUser.role;
                                        newUser.dash_number = fakeUser.dash_number;
                                        newUser.driver_cert = fakeUser.driver_cert;
                                        newUser.trailer_cert = fakeUser.trailer_cert;

                                        newUser.photo_url = 'https://i.pinimg.com/originals/aa/05/23/aa05237847e53e19a5d0deef64c33b79.jpg';
                                        newUser.pronoun = 'they/them/their';
                                        newUser.clothe_size = 'Men-S';
                                        newUser.shoe_size = 'Women-2';
                                        newUser.height = '6';

                                        newUser.allergies_dietary_restrictions = 'none';
                                        newUser.medical_conditions = 'Not a real human';
                                        if (fakeUser.role === 'Leader' || fakeUser.role === 'OPO') {
                                          const clubIds = [];
                                          insertedClubs.forEach((insertedClub) => {
                                            clubIds.push(insertedClub._id);
                                          });
                                          newUser.leader_for = clubIds;
                                        } else {
                                          newUser.leader_for = fakeUser.leader_for;
                                        }
                                        newUser.save();
                                      });
                                    });
                                });
                            })
                            .then(() => {
                              console.log('seeded db. Press control+c to exit');
                              // process.exit();
                            });
                        });
                    });
                });
            });
        });
    }).catch((error) => {
      console.log(error);
    });
}

seedDB();
