/* eslint-disable no-loop-func */
import mongoose from 'mongoose'
import { startOf, add, subtract } from 'date-arithmetic'
import axios from 'axios'

import * as constants from '../constants.js'
import { tokenForUser } from '../controllers/user-controller.js'
import Clubs from '../models/club-model.js'
import Users from '../models/user-model.js'
// import Trips from '../models/trip-model';
// import Vehicles from '../models/vehicle-model';
// import VehicleRequests from '../models/vehicle-request-model';
// import Assignmnets from '../models/assignment-model';

mongoose.set('useCreateIndex', true)
mongoose.connect('mongodb://localhost/trailhead', { useNewUrlParser: true }).catch((error) => {
  console.log(`Error connecting to MongoDB: ${error.message}`)
})
// set mongoose promises to es6 default
mongoose.Promise = global.Promise

const today = new Date()
const weekStart = startOf(today, 'week')
// const formatForModel = (d) => { return `${d.getFullYear().toString()}-${(d.getMonth() + 1).toString()}-${(today.getDate() + 1).toString()}`; };

const days = [
  {
    startDate: subtract(weekStart, 3, 'day'),
    endDate: subtract(weekStart, 3, 'day'),
    startTime: '09:00',
    endTime: '20:00'
  },
  {
    startDate: weekStart,
    endDate: weekStart,
    startTime: '08:00',
    endTime: '16:00'
  },
  {
    startDate: add(weekStart, 2, 'day'),
    endDate: add(weekStart, 2, 'day'),
    startTime: '06:00',
    endTime: '14:00'
  },
  {
    startDate: add(weekStart, 2, 'day'),
    endDate: add(weekStart, 2, 'day'),
    startTime: '16:00',
    endTime: '20:00'
  },
  {
    startDate: add(weekStart, 3, 'day'),
    endDate: add(weekStart, 4, 'day'),
    startTime: '10:00',
    endTime: '17:00'
  },
  {
    startDate: add(weekStart, 5, 'day'),
    endDate: add(weekStart, 5, 'day'),
    startTime: '11:00',
    endTime: '16:00'
  },
  {
    startDate: add(weekStart, 5, 'day'),
    endDate: add(weekStart, 5, 'day'),
    startTime: '13:00',
    endTime: '19:00'
  },
  {
    startDate: add(weekStart, 6, 'day'),
    endDate: add(weekStart, 6, 'day'),
    startTime: '07:00',
    endTime: '19:00'
  },
  {
    startDate: add(weekStart, 6, 'day'),
    endDate: add(weekStart, 6, 'day'),
    startTime: '19:30',
    endTime: '23:00'
  },
  {
    startDate: add(weekStart, 7, 'day'),
    endDate: add(weekStart, 7, 'day'),
    startTime: '15:00',
    endTime: '22:00'
  },
  {
    startDate: add(weekStart, 25, 'day'),
    endDate: add(weekStart, 25, 'day'),
    startTime: '11:00',
    endTime: '22:00'
  }
]

const titles = [
  'A trip in the past!',
  'Sunrike to Mt. Cube',
  'Down to center of Earth',
  'SpaceX launch to Mars',
  'Raid Brown Univesity',
  'Moosilauke day trip',
  'Beginner climbing trip',
  'Learn to fly club',
  'For beginners - chill',
  'Parachute-less skydiving',
  'Trip in a month'
]

const experienceNeededs = [false, true, true, true, true, true, true, false, true, false, false]

const statuses = ['approved', 'pending', 'pending', 'approved', 'approved', 'pending', 'denied', 'denied', 'approved', 'denied', 'approved']

const coleaders = ['ziray.hao.22@dartmouth.edu', 'zirui.hao@gmail.com', 'ziray.hao@dali.dartmouth.edu']

// create trips

const generateTripTemplate = (title, clubID, startDate, endDate, startTime, endTime, experienceNeeded, status) => {
  const trip = {
    injectingStatus: true,
    title,
    leaders: coleaders.slice(0, Math.floor(Math.random() * (coleaders.length - 1))),
    club: clubID,
    experienceNeeded,
    description: 'This trip was created automatically to showcase the platform\'s features. Now for some nonsense: lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    mileage: '16',
    location: 'Faraway Lands',
    startDate,
    endDate,
    startTime,
    endTime,
    cost: '20',
    pickup: 'Robo',
    dropoff: 'We don\'t come back',
    coLeaderCanEditTrip: true,
    gearRequests: [
      { name: 'Tent', quantity: 1 }, { name: 'GPS', quantity: 3 }, { name: 'Phones', quantity: 10 }
    ],
    gearStatus: status,
    trippeeGearStatus: status,
    trippeeGear: [
      {
        name: 'Hiking boots',
        sizeType: 'Shoe',
        quantity: 0
      },
      {
        name: 'Raincoat',
        sizeType: 'Clothe',
        quantity: 0
      },
      {
        name: 'Underlayers',
        sizeType: 'Clothe',
        quantity: 0
      },
      {
        name: 'Head lamp',
        sizeType: 'N/A',
        quantity: 0
      },
      {
        name: 'Skis',
        sizeType: 'Height',
        quantity: 0
      }
    ],
    pcard: [
      {
        numPeople: '8',
        snacks: '3',
        breakfast: '20',
        lunch: '8',
        dinner: '10',
        otherCosts: {
          title: 'Life insurance',
          cost: '300'
        },
        errorFields: {
          title: false,
          cost: false,
          startDate: false,
          endDate: false,
          startTime: false,
          endTime: false,
          mileage: false,
          location: false,
          pickup: false,
          dropoff: false,
          description: false,
          leaders: false,
          dinner: false
        }
      }
    ],
    pcardStatus: status,
    vehicles: [
      {
        vehicleType: 'Van',
        vehicleDetails: 'Any regular van',
        tripLength: 'multi-day-trip',
        pickupDate: startDate,
        returnDate: endDate,
        pickupTime: startTime,
        returnTime: endTime,
        passNeeded: true,
        trailerNeeded: true
      }
    ],
    vehicleStatus: status,
    vehicleReqId: null
  }
  if (status === 'approved') trip.pcardAssigned = '8892-9299-1109-2090'
  return trip
}

const wait = (timeout) => {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout)
  })
}

Users.findOne({ role: 'Leader' }).then((user) => {
  Clubs.find({}).then(async (clubs) => {
    for (let i = 0; i < titles.length; i += 1) {
      const clubID = clubs[Math.floor(Math.random() * clubs.length)]
      const day = days[i]
      const trip = generateTripTemplate(titles[i], clubID, day.startDate, day.endDate, day.startTime, day.endTime, experienceNeededs[i], statuses[i])
      axios.post(`${constants.backendURL}/trips`, trip, { headers: { Authorization: `Bearer ${tokenForUser(user, 'normal')}` } }).then((response) => {
        const vReqID = response.data.vehicleRequest._id
        const assignments = [
          {
            assignedVehicle: 'Van G',
            pickupDate: day.startDate,
            returnDate: day.endDate,
            pickupTime: day.startTime,
            returnTime: day.endTime,
            assignedKey: '33G',
            responseIndex: 0
          }
        ]
        Users.findOne({ role: 'OPO' }).then((OPOUser) => {
          axios.post(`${constants.backendURL}/opoVehicleRequest/${vReqID}`, { assignments }, { headers: { Authorization: `Bearer ${tokenForUser(OPOUser, 'normal')}` } }).catch((error) => { return console.log(error) })
        })
      }).catch((error) => { return console.log(error) })
      console.log('Trip created')
      // eslint-disable-next-line no-await-in-loop
      await wait(1000)
    }
  })
})
