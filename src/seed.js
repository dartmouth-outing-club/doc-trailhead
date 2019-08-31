import mongoose from 'mongoose';
import Clubs from './models/club_model';
import Users from './models/user_model';
import Trips from './models/trip_model';
import LeaderApprovals from './models/leader_approval_model';
import CertApprovals from './models/cert_approval_model';
import Vehicles from './models/vehicle_model';
import VehicleRequests from './models/vehicle_request_model';
import Assignmnets from './models/assignment_model';

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/doc-planner';
mongoose.set('useCreateIndex', true);
mongoose.connect(mongoURI, { useNewUrlParser: true });
// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

const fakeUsers = [
  // {
  //   email: 'trippee@dartmouth.edu',
  //   password: '12345',
  //   name: 'Trippee',
  //   role: 'Trippee',
  //   leader_for: [],
  //   dash_number: '12345',
  // },
  // {
  //   email: 'opo@dartmouth.edu',
  //   password: '12345',
  //   name: 'OPO',
  //   role: 'OPO',
  //   leader_for: [],
  //   dash_number: '12345',
  // },
  // {
  //   email: 'leader@dartmouth.edu',
  //   password: '12345',
  //   name: 'Leader',
  //   role: 'Leader',
  //   leader_for: [],
  //   dash_number: '12345',
  //   driver_cert: 'MICROBUS',
  //   trailer_cert: true,
  // },
//emma
  // {
  //   casID: 'Emma P. Rafkin@DARTMOUTH.EDU',
  //   email: 'Emma.P.Rafkin.21@darmouth.edu',
  //   password: 'test',
  //   name: 'Emma',
  //   role: 'Leader',
  //   leader_for: [],
  //   dash_number:'1111',
  //   has_pending_leader_change: false,
  //   has_pending_cert_change: false,
  //   driver_cert: null,
  //   trailer_cert: false,
  // },
//prosper
  {
    casID: 'Chikezie Onungwa@DARTMOUTH.EDU',
    email: 'chikezie.onungwa.21@dartmouth.edu',
    password: 'test',
    name: 'Prosper!',
    role: 'Leader',
    leader_for: [],
    dash_number:'2222',
    has_pending_leader_change: false,
    has_pending_cert_change: false,
    driver_cert: null,
    trailer_cert: false,
  },
  
    //ACTUAL OPO OFFICE ACCOUNTS DONT DELETE
  {
    casID: 'Julie C. Bell@DARTMOUTH.EDU',
    email: 'julie.c.bell@dartmouth.edu',
    password: '',
    name: 'Julie Bell',
    role: 'OPO',
    leader_for: [],
    dash_number:'',
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
    dash_number:'',
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
    dash_number:'',
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
    dash_number:'',
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
    dash_number:'',
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
    dash_number:'',
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
    name: 'Stake Truck',
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
]



function seedDb() {
  CertApprovals.deleteMany({})
    .then(() => {
      LeaderApprovals.deleteMany({})
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
                              Vehicles.insertMany(vehicles)
                                .then((vehicles) => {
                                  Clubs.insertMany(clubs)
                                    .then((clubs) => {
                                      fakeUsers.map((fakeUser) => {
                                        const newUser = new Users();
                                        newUser.casID = fakeUser.casID;
                                        newUser.email = fakeUser.email;
                                        newUser.password = fakeUser.password;
                                        newUser.name = fakeUser.name;
                                        newUser.role = fakeUser.role;
                                        newUser.dash_number = fakeUser.dash_number;
                                        newUser.driver_cert = fakeUser.driver_cert;
                                        newUser.trailer_cert = fakeUser.trailer_cert;
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
                                })
                                .then(() => {
                                  console.log('seeded db. Press control+c to exit');
                                })
                            })
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
