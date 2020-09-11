import Trip from '../models/trip-model';
import User from '../models/user-model';
import Club from '../models/club-model';
import Global from '../models/global-model';
import VehicleRequest from '../models/vehicle-request-model';
import { tokenForUser } from './user-controller';
import { deleteVehicleRequest } from './vehicle-request-controller';
import * as constants from '../constants';
import { mailer } from '../services';

const populateTripDocument = (tripQuery, fields) => {
  const fieldsDirectory = {
    club: 'club',
    leaders: 'leaders',
    vehicleRequest: 'vehicleRequest',
    membersUser: { path: 'members.user', model: 'User' },
    pendingUser: { path: 'pending.user', model: 'User' },
    vehicleRequestAssignments: { path: 'vehicleRequest', populate: { path: 'assignments', model: 'Assignment' } },
    vehicleRequestAssignmentsAssignedVehicle: { path: 'vehicleRequest', populate: { path: 'assignments', populate: { path: 'assigned_vehicle', mode: 'Vehicle' } } },
  };
  return tripQuery.populate(fields.map((field) => { return fieldsDirectory[field]; }));
};

/**
 * Fetches a single trip with all fields populated.
 * @param {express.req} req
 * @param {express.res} res
 */
export const getTrip = (tripID, forUser) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['club', 'leaders', 'vehicleRequest', 'membersUser', 'pendingUser', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'])
      .then((trip) => {
        const isPending = trip.pending.some((pender) => {
          return pender.user.equals(forUser.id);
        });

        const isOnTrip = trip.members.some((member) => {
          return member.user.id === forUser.id;
        });

        let userTripStatus;
        if (isPending) userTripStatus = 'PENDING';
        else if (isOnTrip) userTripStatus = 'APPROVED';
        else userTripStatus = 'NONE';

        let isLeaderOnTrip;
        if (trip.coLeaderCanEditTrip) {
          isLeaderOnTrip = trip.leaders.some((leader) => {
            return leader._id.equals(forUser.id);
          });
        } else {
          isLeaderOnTrip = trip.leaders[0]._id.equals(forUser.id);
        }

        resolve({ trip, userTripStatus, isLeaderOnTrip });
      })
      .catch((error) => {
        reject(error);
      });
  });
};

/**
 * Creates a trip.
 * @param {User} creator The user document returned from passport.js for the user who intiated this trip
 * @param {Trip} data The trip parameters
 */
export const createTrip = (creator, data) => {
  return new Promise(async (resolve, reject) => {
  // Retrieves the current maximum trip number and then updates it immediately.
    const globals = await Global.find({});
    globals[0].tripNumberMax += 1;
    const nextTripNumber = globals[0].tripNumberMax;
    await globals[0].save();

    // Creates the new trip
    const trip = new Trip();
    trip.number = nextTripNumber;
    trip.startDate = data.startDate;
    trip.endDate = data.endDate;
    trip.startTime = data.startTime;
    trip.startDateAndTime = constants.createDateObject(data.startDate, data.startTime);
    trip.endDateAndTime = constants.createDateObject(data.endDate, data.endTime);
    trip.endTime = data.endTime;
    trip.title = data.title;
    trip.description = data.description;
    trip.club = data.club;
    trip.cost = data.cost;
    trip.experienceNeeded = data.experienceNeeded;
    trip.location = data.location;
    trip.pickup = data.pickup;
    trip.dropoff = data.dropoff;
    trip.mileage = data.mileage;
    trip.coLeaderCanEditTrip = data.coLeaderCanEditTrip;
    trip.OPOGearRequests = data.gearRequests;
    trip.trippeeGear = data.trippeeGear;
    trip.pcard = data.pcard;

    if (data.injectingStatus) { // TO-DELETE was used for debugging
      trip.gearStatus = data.gearStatus;
      trip.trippeeGearStatus = data.trippeeGearStatus;
      trip.pcardStatus = data.pcardStatus;
    } else {
      if (data.gearRequests.length > 0) trip.gearStatus = 'pending';
      if (data.trippeeGear.length > 0) trip.trippeeGearStatus = 'pending';
      if (data.pcard.length > 0) trip.pcardStatus = 'pending';
    }

    // Add the trip creator to the trip
    trip.members = [{ user: creator._id, requestedGear: [] }];
    trip.owner = creator._id;
    trip.leaders = [creator._id];
    trip.pending = [];

    const leaderEmails = [creator.email]; // Used to send out initial email
    const foundUsers = await User.find({ email: { $in: data.leaders } });
    foundUsers.forEach((foundUser) => {
      if (!foundUser._id.equals(creator._id)) {
        trip.leaders.push(foundUser._id);
        trip.members.push({ user: foundUser._id, requestedGear: [] });
        leaderEmails.push(foundUser.email);
      }
    });
    trip.save().then(async (savedTrip) => {
      mailer.send({ address: leaderEmails, subject: `New Trip #${savedTrip.number} created`, message: `Hello,\n\nYou've created a new Trip #${savedTrip.number}: ${savedTrip.title}! You will receive email notifications when trippees sign up.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nIMPORTANT: on the day of the trip, you must check-out all attendees here: ${constants.frontendURL}/trip-check-out/${savedTrip._id}?token=${tokenForUser(creator, 'mobile', savedTrip._id)}\n\nBest,\nDOC Planner` });
      if (data.vehicles.length > 0) {
      // Retrieves the current maximum vehicle request number and then updates it immediately
        const globalsForVehicleRequest = await Global.find({});
        globalsForVehicleRequest[0].vehicleRequestNumberMax += 1;
        const nextVehicleRequestNumber = globals[0].vehicleRequestNumberMax;
        await globalsForVehicleRequest[0].save();

        // Creates a new vehicle request
        const vehicleRequest = new VehicleRequest();
        vehicleRequest.number = nextVehicleRequestNumber;
        vehicleRequest.requester = creator._id;
        vehicleRequest.mileage = data.mileage;
        vehicleRequest.requestDetails = data.description;
        vehicleRequest.associatedTrip = savedTrip._id;
        vehicleRequest.requestType = 'TRIP';
        vehicleRequest.requestedVehicles = data.vehicles;
        vehicleRequest.save().then(async (savedVehicleRequest) => {
          mailer.send({ address: leaderEmails, subject: `re: New Trip #${savedTrip.number} created`, message: `Hello,\n\nYou've also created a new vehicle request, V-Req #${savedVehicleRequest.number}: ${savedTrip.title} that is linked to your Trip #${savedTrip.number}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${savedVehicleRequest._id}\n\nThis request is associated with the trip, and is deleted if the trip is deleted.\n\nBest,\nDOC Planner` });
          if (data.injectingStatus) savedTrip.vehicleStatus = data.vehicleStatus;
          else savedTrip.vehicleStatus = 'pending';
          savedTrip.vehicleRequest = savedVehicleRequest;
          resolve({ trip: await savedTrip.save(), vehicleRequest: savedVehicleRequest });
        }).catch((error) => { reject(new Error(`${'Trip successfully created, but error creating associated vehicle request for trip:'} ${error.toString()}`)); });
      } else resolve(savedTrip);
    }).catch((error) => { reject(error); });
  });
};

/**
 * Updates a trip.
 * @param {express.req} req
 * @param {express.res} res
 */
export const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.tripID).exec();
    if (trip.leaders.indexOf(req.user._id) !== -1 || req.user.role === 'OPO') {
      trip.startDate = req.body.startDate;
      trip.endDate = req.body.endDate;
      trip.startTime = req.body.startTime;
      trip.endTime = req.body.endTime;
      trip.startDateAndTime = constants.createDateObject(req.body.startDate, req.body.startTime);
      trip.endDateAndTime = constants.createDateObject(req.body.endDate, req.body.endTime);
      trip.title = req.body.title;
      trip.description = req.body.description;
      trip.coLeaderCanEditTrip = req.body.coLeaderCanEditTrip;
      trip.club = req.body.club;
      trip.location = req.body.location;
      trip.pickup = req.body.pickup;
      trip.dropoff = req.body.dropoff;
      trip.cost = req.body.cost;
      trip.experienceNeeded = req.body.experienceNeeded;
      trip.OPOGearRequests = req.body.gearRequests;
      trip.trippeeGear = req.body.trippeeGear;
      trip.pcard = req.body.pcard;
      trip.returned = req.body.returned;

      /**
       * Updates each member's gear requests based on the new gear.
       */
      trip.members.concat(trip.pending).forEach((person) => {
        const markToRemove = [];
        person.requestedGear.forEach((gear, idx) => {
          let found = false;
          trip.trippeeGear.forEach((newGear) => {
            if (gear.gearId === newGear._id.toString()) {
              gear.gearId = newGear._id;
              found = true;
            }
          });
          if (!found) {
            markToRemove.push(idx);
          }
        });
        for (let i = 0; i < markToRemove.length; i += 1) person.requestedGear.splice(markToRemove[i], 1);
      });

      await calculateRequiredGear(trip);

      if (trip.gearStatus === 'N/A' && req.body.gearRequests.length > 0) {
        trip.gearStatus = 'pending';
      }
      if (trip.gearStatus === 'pending' && req.body.gearRequests.length === 0) {
        trip.gearStatus = 'N/A';
      }

      if (trip.trippeeGearStatus === 'N/A' && req.body.trippeeGear.length > 0) {
        trip.trippeeGearStatus = 'pending';
      }
      if (trip.trippeeGearStatus === 'pending' && req.body.trippeeGear.length === 0) {
        trip.trippeeGearStatus = 'N/A';
      }

      if (trip.pcardStatus === 'N/A' && req.body.pcard.length > 0) {
        trip.pcardStatus = 'pending';
      }
      if (trip.pcardStatus === 'pending' && req.body.pcard.length === 0) {
        trip.pcardStatus = 'N/A';
      }

      if (trip.vehicleStatus === 'N/A' && req.body.vehicles.length > 0) {
        const vehicleRequest = new VehicleRequest();
        vehicleRequest.requester = req.user._id;
        vehicleRequest.mileage = req.body.mileage;
        vehicleRequest.associatedTrip = trip;
        vehicleRequest.requestType = 'TRIP';
        vehicleRequest.requestedVehicles = req.body.vehicles;
        const savedVehicleRequest = await vehicleRequest.save();
        trip.vehicleStatus = 'pending';
        trip.vehicleRequest = savedVehicleRequest;
      }
      if (trip.vehicleStatus === 'pending' && req.body.vehicles.length === 0) {
        await VehicleRequest.deleteOne({ _id: req.body.vehicleReqId });
        trip.vehicleStatus = 'N/A';
      }
      const coleaders = await User.find({ email: { $in: req.body.leaders } }).exec();
      const allLeaders = [];
      allLeaders.push(trip.leaders[0]);
      coleaders.forEach((coleader) => {
        allLeaders.push(coleader._id);
      });
      trip.leaders = allLeaders;
      await trip.save();
      getTrip(req, res);
    } else {
      res.status(422).send('You must be a leader on the trip');
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

/**
 Fetches all trips with all fields populated.
 */
export const getTrips = (filters = {}) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.find(filters), ['club', 'leaders', 'vehicleRequest', 'membersUser', 'pendingUser', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'])
      .then((trips) => {
        resolve(trips);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const getTripsByClub = (req, res) => {
  const { club } = req.params;
  Club.findOne({ name: club }, (err, theClub) => {
    if (!theClub) {
      res.json({ error: 'no club' });
    } else {
      const id = theClub._id;
      Trip.find({ club: id }, (err, trips) => {
        if (err) {
          res.json({ error: err });
        } else {
          res.json(trips);
        }
      });
    }
  });
};

/**
 * Fetches only trips that have gear, P-Card, or vehicle requests.
 * @param {express.req} req
 * @param {express.res} res
 */
export const getOPOTrips = (req, res) => {
  Trip.find({
    $or: [
      { trippeeGearStatus: { $ne: 'N/A' } },
      { gearStatus: { $ne: 'N/A' } },
      { pcardStatus: { $ne: 'N/A' } },
      { vehicleStatus: { $ne: 'N/A' } },
    ],
  }).populate('leaders').populate('club').populate('vehicleRequest')
    .populate({
      path: 'members.user',
      model: 'User',
    })
    .then((trips) => {
      res.json(trips);
    });
};

// EDITING GEAR ON TRIPS

/**
 * Recalculates the sum of trippee gear requests from the current list of members.
 * @param {Trip} trip
 */
function calculateRequiredGear(trip) {
  return new Promise((resolve) => {
    trip.trippeeGear.forEach((gear) => { gear.quantity = 0; });
    trip.members.forEach((member) => {
      member.requedtedGear.forEach((g) => {
        trip.trippeeGear.forEach((gear) => {
          if (g.gearId === gear._id.toString()) {
            gear.quantity += 1;
          }
        });
      });
    });
    resolve();
  });
}


export const getGearRequests = (req, res) => {
  Trip.find({ gearStatus: { $not: { $in: ['N/A'] } } }).populate('leaders').populate('club').populate({
    path: 'members.user',
    model: 'User',
  })
    .then((gearRequests) => {
      return res.json(gearRequests);
    });
};

/**
 * Allows a user - both pending and approved - to edit their gear requests.
 * @param {express.req} req
 * @param {express.res} res
 */
export const editUserGear = (req, res) => {
  const { tripID } = req.params;
  const { trippeeGear } = req.body;
  Trip.findById(tripID).populate('leaders').then((trip) => {
    trip.pending.concat(trip.members).forEach((person) => {
      if (person.user._id.equals(req.user._id)) {
        person.requestedGear = trippeeGear;
        User.findById(req.user._id).then((user) => {
          mailer.send({ address: trip.leaders.map((leader) => { return leader.email; }), subject: `Trip Update: ${user.name} changed gear requests`, message: `Hello,\n\nTrippee ${user.name} for Trip #${trip.number}: ${trip.title} changed their gear requests. You can reach them at ${user.email}.\n\nView the change here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
        });
      }
    });
    calculateRequiredGear(trip).then(() => {
      trip.save().then(() => {
        getTrip(req, res);
      });
    });
  }).catch((error) => {
    res.status(500).send(error.message);
  });
};

// JOINING AND LEAVING TRIPS

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {express.req} req
 * @param {express.res} res
 */
export const addToPending = (req, res) => {
  const id = req.params.tripID;
  const { trippeeGear } = req.body;
  Trip.findById(id)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    })
    .populate({
      path: 'pending.user',
      model: 'User',
    })
    .then((trip) => {
      trip.pending.push({ user: req.user._id, gear: trippeeGear });
      trip.save()
        .then(() => {
          mailer.send({ address: req.user.email, subject: 'Confirmation: You\'ve signed up for a trip', message: `Hello ${req.user.name},\n\nYou've signed up for Trip #${trip.number}: ${trip.title}, awaiting leader approval.\n\nView the trip here: ${constants.frontendURL}/trip/${id}\n\nYou can reach the trip leader at ${trip.leaders[0].email}.\n\nBest,\nDOC Planner` });
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip Update: ${req.user.name} applied to your trip`, message: `Hello,\n\nTrippee ${req.user.name} has applied to join Trip #${trip.number}: ${trip.title}. Please use our platform to approve them. You can reach them at ${req.user.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          getTrip(req, res);
        });
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

/**
 * Moves a pending member to the approved list, while adding their gear requests to the trip's total.
 * Sends approved notification email to the trippee and a notice to all leaders and co-leaders.
 * @param {express.req} req
 * @param {express.res} res
 */
export const joinTrip = (req, res) => {
  const id = req.params.tripID;
  const { pend } = req.body;
  Trip.findById(id)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    })
    .populate({
      path: 'pending.user',
      model: 'User',
    })
    .then((trip) => {
      // add user to member list
      if (!trip.members.some((member) => { return member.user._id.equals(pend.user._id); })) {
        trip.members.push(pend);
      }
      // remove user from pending list
      trip.pending.forEach((pender, index) => {
        if (pender._id.equals(pend._id)) {
          trip.pending.splice(index, 1);
        }
      });
      calculateRequiredGear(trip).then(() => {
        trip.save().then(() => {
          User.findById(pend.user).then((foundUser) => {
            mailer.send({ address: foundUser.email, subject: 'Trip Update: You\'ve been approved!', message: `Hello ${foundUser.name},\n\nYou've been approved for Trip #${trip.number}: ${trip.title}!\n\nView the trip here: ${constants.frontendURL}/trip/${id}\n\nYou can reach the trip leader at ${trip.leaders[0].email}.\n\nBest,\nDOC Planner` });
            const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
            mailer.send({ address: leaderEmails, subject: `Trip Update: ${foundUser.name} got approved!`, message: `Hello,\n\nYour pending trippee ${foundUser.name} for Trip #${trip.number}: ${trip.title} has been approved. You can reach them at ${foundUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          });
          getTrip(req, res);
        });
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};
export const assignToLeader = (req, res) => {
  Trip.findById(req.params.tripID)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    }).populate({
      path: 'pending.user',
      model: 'User',
    })
    .then((trip) => {
      trip.members.some((member, index) => {
        if (member.user._id.equals(req.body.member.user._id)) {
          trip.members.splice(index, 1); // remove the trippee from the member list
          trip.members.splice(0, 0, member); // readd trippee to become leader
        }
        return member.user.id === req.body.member.user.id;
      });
      trip.save()
        .then(() => {
          getTrip(req, res);
        });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};
/**
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {*} req
 * @param {*} res
 */
export const moveToPending = (req, res) => {
  Trip.findById(req.params.tripID)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    }).populate({
      path: 'pending.user',
      model: 'User',
    })
    .then((trip) => {
      trip.members.some((member, index) => {
        if (member.user._id.equals(req.body.member.user._id)) {
          trip.members.splice(index, 1); // remove the trippee from the member list
        }
        return member.user.id === req.body.member.user.id;
      });
      if (!trip.pending.some((pender) => { return pender.user._id.equals(req.body.member.user._id); })) {
        trip.pending.push(req.body.member);
      }
      calculateRequiredGear(trip).then(() => {
        trip.save().then(() => {
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip Update: ${req.body.member.user.name} moved back to pending`, message: `Hello,\n\nYour approved trippee ${req.body.member.name} for Trip #${trip.number}: ${trip.title} has been moved from the approved list to the pending list. You can reach them at ${req.body.member.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          getTrip(req, res);
        });
      });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};

/**
 * Processes request from trippee to leave trip.
 * If the trippee was approved, removes all gear requested by trippee in the group list and sends email alert to all trip leaders and co-leaders.
 * Returns the modified trip document to client.
 * @param {*} req
 * @param {*} res
 */
export const leaveTrip = (req, res) => {
  Trip.findById(req.params.tripID)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    }).then((trip) => {
      User.findById(req.user.id).then((leavingUser) => {
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip Update: ${leavingUser.name} left your trip`, message: `Hello,\n\nYour approved trippee ${leavingUser.name} for Trip #${trip.number}: ${trip.title} cancelled for this trip. You can reach them at ${leavingUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
      });
      let userIdx = -1;
      if (trip.pending.some((pender, idx) => {
        if (pender.user._id.equals(req.user._id)) {
          userIdx = idx;
          return true;
        } else return false;
      })) {
        trip.pending.splice(userIdx, 1);
      } else if (trip.members.some((member, idx) => {
        if (member.user._id.equals(req.user._id)) {
          userIdx = idx;
          return true;
        } else return false;
      })) {
        trip.members.splice(userIdx, 1);
      }
      calculateRequiredGear(trip).then(() => {
        trip.save().then(() => {
          getTrip(req, res);
        });
      });
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

/**
 * Sets the attending status for each member of trip.
 * @param {express.req} req
 * @param {express.res} res
 */
export const setMemberAttendance = (req, res) => {
  const { tripID } = req.params;
  const { memberID } = req.body;
  const { status } = req.body;
  Trip.findById(tripID).then((trip) => {
    Promise.all(
      trip.members.map((member) => {
        if (member.user.toString() === memberID) {
          return new Promise((resolve) => {
            member.attended = status;
            resolve();
          });
        } else return null;
      }),
    ).then(() => {
      trip.save().then(() => {
        res.json({ status });
      });
    });
  }).catch((error) => { return res.status(500).json(error); });
};

/**
 * Sets the returned status for the trip.
 * @param {express.req} req
 * @param {express.res} res
 */
export const toggleTripReturnedStatus = (req, res) => {
  const { tripID } = req.params;
  const { status } = req.body;
  const now = new Date();
  Trip.findById(tripID).populate('leaders').then((trip) => {
    trip.returned = status;
    trip.save().then((savedTrip) => {
      const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
      if (trip.markedLate) leaderEmails.concat(constants.OPOEmails); // will inform OPO that the trip has been returned if it had been marked as late (3 hr) before
      mailer.send({ address: leaderEmails, subject: `Trip #${trip.number} ${!status ? 'un-' : ''}returned`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, has been marked as ${!status ? 'NOT' : ''} returned at ${now}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Planner` });
      getTrip(req, res);
    });
  }).catch((error) => { return res.status(500).json(error); });
};

/**
 * Deletes a trip.
 * @param {express.req} req
 * @param {express.res} res
 */
export const deleteTrip = (req, res) => {
  Trip.findById(req.params.tripID)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    })
    .populate({
      path: 'pending.user',
      model: 'User',
    })
    .populate('vehicleRequest')
    .then((trip) => {
      if (trip.leaders.some((leader) => { return leader._id.equals(req.user._id); })) {
        Trip.deleteOne({ _id: req.params.tripID }, async (err) => {
          if (err) {
            res.json({ error: err });
          } else {
            mailer.send({ address: trip.members.concat(trip.pending).map((person) => { return person.user.email; }), subject: `Trip #${trip.number} deleted`, message: `Hello,\n\nThe Trip #${trip.number}: ${trip.title} which you have been signed up for (or requested to be on) has been deleted. The original trip leader can be reached at ${trip.leaders[0].email}.\n\nReason: ${req.body.reason ? req.body.reason : 'no reason provided.'}\n\nBest,\nDOC Planner` });
            if (trip.vehicleRequest) {
              await deleteVehicleRequest(trip.vehicleRequest._id);
              mailer.send({ address: trip.leaders.map((leader) => { return leader.email; }), subject: `re: Trip #${trip.number} deleted`, message: `Hello,\n\nThe associated vehicle request, V-Req #${trip.vehicleRequest.number}: ${trip.title} that is linked to your Trip #${trip.number} has also been deleted since your trip was deleted. We have informed OPO staff that you will no longer be needing this vehicle.\n\nBest,\nDOC Planner` });
              res.json({ message: 'Trip and associated vehicle request successfully' });
            } else {
              res.json({ message: 'Trip removed successfully' });
            }
          }
        });
      } else {
        res.status(422).send('You must be a leader on the trip');
      }
    })
    .catch((error) => {
      res.json({ error });
    });
};


/**
 * OPO approves or denies a trip's general gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const respondToGearRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.gearStatus = req.body.status;
      trip.save()
        .then(() => {
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip Update: Gear requests got ${req.body.status ? 'approved!' : 'denied'}`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title} has gotten all of its group gear requests ${req.body.status ? 'approved' : 'denied'} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          getTrip(req, res);
        });
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const getTrippeeGearRequests = (req, res) => {
  Trip.find({ trippeeGearStatus: { $ne: 'N/A' } }).populate('leaders').populate('club').populate({
    path: 'members.user',
    model: 'User',
  })
    .then((trippeeGearRequests) => {
      res.json(trippeeGearRequests);
    });
};

/**
 * OPO approves or denies a trip's trippee gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const respondToTrippeeGearRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.trippeeGearStatus = req.body.status;
      trip.save()
        .then(() => {
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip Update: Gear requests got ${req.body.status ? 'approved!' : 'denied'}`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title} has gotten its trippee (not group) gear requests ${req.body.status ? 'approved' : 'denied'} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          getTrip(req, res);
        });
    }).catch((error) => {
      res.status(500).send(error);
    });
};

/**
 * OPO assigns a P-Card to a trip or denies.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const respondToPCardRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.pcardStatus = req.body.pcardStatus;
      trip.pcardAssigned = req.body.pcardAssigned;
      req.params.tripID = req.body.id;
      trip.save()
        .then(() => {
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip Update: P-Card requests got ${req.body.status ? 'approved!' : 'denied'}`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title} has gotten its P-Card requests ${req.body.status ? 'approved' : 'denied'} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          getTrip(req, res);
        });
    }).catch((error) => {
      res.status(500).send(error);
    });
};
