import Trip from '../models/trip-model';
import User from '../models/user-model';
import Club from '../models/club-model';
import Global from '../models/global-model';
import VehicleRequest from '../models/vehicle-request-model';
import { tokenForUser } from './user-controller';
import { deleteVehicleRequest } from './vehicle-request-controller';
import * as constants from '../constants';
import { mailer } from '../services';
import AssignmentModel from '../models/assignment-model';

const populateTripDocument = (tripQuery, fields) => {
  const fieldsDirectory = {
    owner: 'owner',
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


const sendLeadersEmail = (tripID, subject, message) => {
  populateTripDocument(Trip.findById(tripID), ['leaders'])
    .then((trip) => {
      mailer.send({ address: trip.leaders.map((leader) => { return leader.email; }), subject, message });
    });
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

/**
 * Fetches only trips that have gear, P-Card, or vehicle requests.
 * @param {express.req} req
 * @param {express.res} res
 */
export const getOPOTrips = (req, res) => {
  populateTripDocument(
    Trip.find({
      $or: [
        { trippeeGearStatus: { $ne: 'N/A' } },
        { gearStatus: { $ne: 'N/A' } },
        { pcardStatus: { $ne: 'N/A' } },
        { vehicleStatus: { $ne: 'N/A' } },
      ],
    }), ['leaders', 'club', 'membersUser', 'pendingUser', 'vehicleRequest', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'],
  )
    .then((trips) => {
      res.json(trips);
    });
};

/**
 * Fetches a single trip with all fields populated.
 * @param {express.req} req
 * @param {express.res} res
 */
export const getTrip = (tripID, forUser) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['owner', 'club', 'leaders', 'vehicleRequest', 'membersUser', 'pendingUser', 'vehicleRequestAssignments', 'vehicleRequestAssignmentsAssignedVehicle'])
      .then((trip) => {
        let userTripStatus;
        let isLeaderOnTrip;
        if (forUser) {
          const isPending = trip.pending.some((pender) => {
            return pender.user.equals(forUser.id);
          });

          const isOnTrip = trip.members.some((member) => {
            return member.user.id === forUser.id;
          });

          if (isPending) userTripStatus = 'PENDING';
          else if (isOnTrip) userTripStatus = 'APPROVED';
          else userTripStatus = 'NONE';

          if (trip.coLeaderCanEditTrip) {
            isLeaderOnTrip = trip.leaders.some((leader) => {
              return leader._id.equals(forUser.id);
            });
          } else {
            isLeaderOnTrip = trip.owner._id.equals(forUser.id);
          }
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
      if (data.pcardStatus === 'approved') trip.pcardAssigned = data.pcardAssigned;
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
        vehicleRequest.requestedVehicles = data.vehicles.map((requestedVehicle) => { return { ...requestedVehicle, pickupDateAndTime: constants.createDateObject(requestedVehicle.pickupDate, requestedVehicle.pickupTime), returnDateAndTime: constants.createDateObject(requestedVehicle.returnDate, requestedVehicle.returnTime) }; });
        vehicleRequest.save().then(async (savedVehicleRequest) => {
          mailer.send({ address: leaderEmails, subject: `re: New Trip #${savedTrip.number} created`, message: `Hello,\n\nYou've also created a new vehicle request, V-Req #${savedVehicleRequest.number}: ${savedTrip.title} that is linked to your Trip #${savedTrip.number}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${savedVehicleRequest._id}\n\nThis request is associated with the trip, and is deleted if the trip is deleted.\n\nBest,\nDOC Planner` });
          if (data.injectingStatus) savedTrip.vehicleStatus = data.vehicleStatus;
          else savedTrip.vehicleStatus = 'pending';
          savedTrip.vehicleRequest = savedVehicleRequest;
          resolve(await savedTrip.save());
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
    const trip = await Trip.findById(req.params.tripID);
    if (trip.leaders.some((leaderID) => { return leaderID.toString() === req.user._id.toString(); }) || req.user.role === 'OPO') {
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
        vehicleRequest.requestedVehicles = req.body.vehicles.map((requestedVehicle) => { return { ...requestedVehicle, pickupDateAndTime: constants.createDateObject(requestedVehicle.pickupDate, requestedVehicle.pickupTime), returnDateAndTime: constants.createDateObject(requestedVehicle.returnDate, requestedVehicle.returnTime) }; });
        const savedVehicleRequest = await vehicleRequest.save();
        trip.vehicleStatus = 'pending';
        trip.vehicleRequest = savedVehicleRequest;
      }
      if (trip.vehicleStatus === 'pending') {
        if (req.body.vehicles.length === 0) {
          await VehicleRequest.deleteOne({ _id: req.body.vehicleReqId });
          trip.vehicleStatus = 'N/A';
        } else {
          const updates = {};
          if (req.body.mileage) updates.mileage = req.body.mileage;
          if (req.body.description) updates.requestDetails = req.body.description;
          if (req.body.vehicles.length > 0) updates.requestedVehicles = req.body.vehicles.map((requestedVehicle) => { return { ...requestedVehicle, pickupDateAndTime: constants.createDateObject(requestedVehicle.pickupDate, requestedVehicle.pickupTime), returnDateAndTime: constants.createDateObject(requestedVehicle.returnDate, requestedVehicle.returnTime) }; });
          await VehicleRequest.updateOne({ _id: req.body.vehicleReqId }, updates);
        }
      }

      const coleaders = await User.find({ email: { $in: req.body.leaders } }).exec();
      const allLeaders = [];
      allLeaders.push(trip.leaders[0]);
      coleaders.forEach((coleader) => {
        allLeaders.push(coleader._id);
      });
      trip.leaders = allLeaders;
      await trip.save();
      res.json(await getTrip(trip.id));
    } else {
      res.status(422).send('You must be a leader on the trip');
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

/**
 * Deletes a trip.
 * @param {express.req} req
 * @param {express.res} res
 */
export const deleteTrip = (req, res) => {
  populateTripDocument(Trip.findById(req.params.tripID), ['leaders', 'membersUser', 'pendingUser', 'vehicleRequest'])
    .then((trip) => {
      if (trip.leaders.some((leader) => { return leader._id.equals(req.user._id); })) {
        Trip.deleteOne({ _id: req.params.tripID }, async (err) => {
          if (err) {
            res.json({ error: err });
          } else {
            mailer.send({ address: trip.members.concat(trip.pending).map((person) => { return person.user.email; }), subject: `Trip #${trip.number} deleted`, message: `Hello,\n\nThe Trip #${trip.number}: ${trip.title} which you have been signed up for (or requested to be on) has been deleted. The original trip leader can be reached at ${trip.leaders[0].email}.\n\nReason: ${req.body.reason ? req.body.reason : 'no reason provided.'}\n\nBest,\nDOC Planner` });
            if (trip.vehicleRequest) {
              await deleteVehicleRequest(trip.vehicleRequest._id, 'Associated trip has been deleted');
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
 * TRIP GEAR
 */

/**
 * Recalculates the sum of trippee gear requests from the current list of members.
 * @param {Trip} trip
 */
function calculateRequiredGear(trip) {
  return new Promise(async (resolve) => {
    const originalGear = JSON.parse(JSON.stringify(trip.trippeeGear));
    trip.trippeeGear.forEach((gear) => { gear.quantity = 0; });
    trip.members.forEach((member) => {
      member.requestedGear.forEach((g) => {
        trip.trippeeGear.forEach((gear) => {
          if (g.gearId === gear._id.toString()) {
            gear.quantity += 1;
          }
        });
      });
    });
    if ((trip.trippeeGearStatus !== 'approved') || (trip.trippeeGearStatus === 'approved' && originalGear.length === trip.trippeeGear.length && originalGear.map((o, i) => { return [o, trip.trippeeGear[i]]; }).every((combined) => {
      return (combined[0].name === combined[1].name && combined[0].quantity >= combined[1].quantity && combined[0].sizeType === combined[1].sizeType);
    }))) {
      resolve();
    } else {
      trip.trippeeGearStatus = 'pending';
      await trip.save();
      sendLeadersEmail(trip._id, `Trip ${trip.number}: Trippee gear requests un-approved`, `Hello,\n\nYour [Trip #${trip.number}: ${trip.title}]'s trippee (not group) gear requests was originally approved by OPO staff, but since a new trippee was admitted who requested additional gear, it has automatically been sent back to review to OPO staff to ensure we have enough.\nCurrently, your trip's status has been changed back to pending, and you should await re-approval before heading out.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner`);
      mailer.send({ address: constants.OPOEmails, subject: `Trip #${trip.number}'s gear request changed`, message: `Hello,\n\nTrip #${trip.number}: ${trip.title}'s gear requests had been originally approved, but they recently made changes to their trippee gear requests because a new trippee was admitted to the trip.\n\nPlease re-approve their request at: ${constants.frontendURL}/approve-trip/${trip._id}\n\nBest,\nDOC Planner` });
      resolve();
    }
  });
}

/**
 * Allows a user - both pending and approved - to edit their gear requests.
 * @param {express.req} req
 * @param {express.res} res
 */
export const editUserGear = (req, res) => {
  const { tripID } = req.params;
  const { trippeeGear } = req.body;
  populateTripDocument(Trip.findById(tripID), ['leaders', 'membersUser'])
    .then((trip) => {
      const isOnTrip = trip.members.some((member) => {
        return member.user.id === req.user._id.toString();
      });
      trip.pending.concat(trip.members).forEach((person) => {
        if (person.user._id.equals(req.user._id)) {
          person.requestedGear = trippeeGear;
          if (isOnTrip) {
            User.findById(req.user._id).then((user) => {
              mailer.send({ address: trip.leaders.map((leader) => { return leader.email; }), subject: `Trip ${trip.number}: ${user.name} changed gear requests`, message: `Hello,\n\nTrippee ${user.name} for [Trip #${trip.number}: ${trip.title}] changed their gear requests. You can reach them at ${user.email}.\n\nView the change here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
            });
          }
        }
      });
      calculateRequiredGear(trip).then(() => {
        trip.save().then(() => {
          res.send();
        });
      });
    }).catch((error) => {
      res.status(500).json(error);
    });
};

// JOINING AND LEAVING TRIPS

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {String} tripID
 * @param {String} joiningUserID
 * @param {} requestedGear
 */
export const addToPending = (tripID, joiningUserID, requestedGear) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['leaders', 'membersUser', 'pendingUser'])
      .then(async (trip) => {
        trip.pending.push({ user: joiningUserID, requestedGear });
        await trip.save();
        const foundUser = await User.findById(joiningUserID);
        mailer.send({ address: foundUser.email, subject: 'Confirmation: You\'ve signed up for a trip', message: `Hello ${foundUser.name},\n\nYou've signed up for [Trip #${trip.number}: ${trip.title}], awaiting leader approval.\n\nView the trip here: ${constants.frontendURL}/trip/${tripID}\n\nYou can reach the trip leader at ${trip.leaders[0].email}.\n\nBest,\nDOC Planner` });
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: ${foundUser.name} applied to your trip`, message: `Hello,\n\nTrippee ${foundUser.name} has applied to join [Trip #${trip.number}: ${trip.title}]. Please use our platform to approve them. You can reach them at ${foundUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
        resolve();
      })
      .catch((error) => { reject(error); });
  });
};

/**
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {String} tripID The ID of the trip to leave
 * @param {String} leavinUserID The user ID who is leaving
 */
export const reject = (tripID, leavingUserID) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['leaders', 'membersUser', 'pendingUser'])
      .then(async (trip) => {
        let leavingUserPender;
        // Remove the trippee from the member list
        trip.members.forEach((member, index) => {
          if (member.user._id.toString() === leavingUserID) {
            // eslint-disable-next-line prefer-destructuring
            leavingUserPender = trip.members.splice(index, 1)[0];
          }
        });
        // Add user to pending list
        if (leavingUserPender == null) reject(new Error('This user was not on the approved list before'));
        if (!trip.pending.some((pender) => { return pender.user._id.toString() === leavingUserID; })) {
          trip.pending.push(leavingUserPender);
        }
        await calculateRequiredGear(trip);
        await trip.save();
        User.findById(leavingUserID).then((foundUser) => {
          mailer.send({ address: foundUser.email, subject: `Trip ${trip.number}: You've been un-admitted`, message: `Hello ${foundUser.name},\n\nYou've were previously approved for [Trip #${trip.number}: ${trip.title}], but the leader has put you back into pending status, which means you are NOT approved to attend this trip.\n\nView the trip here: ${constants.frontendURL}/trip/${tripID}\n\nYou can reach the trip leader at ${trip.leaders[0].email}.\n\nBest,\nDOC Planner` });
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: ${foundUser.name} moved back to pending`, message: `Hello,\n\nYour approved trippee ${foundUser.name} for [Trip #${trip.number}: ${trip.title}] has been moved from the approved list to the pending list. You can reach them at ${foundUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          resolve();
        });
      })
      .catch((error) => { console.log(error); reject(error); });
  });
};

/**
 * Moves a pending member to the approved list, while adding their gear requests to the trip's total.
 * Sends approved notification email to the trippee and a notice to all leaders and co-leaders.
 * @param {String} tripID The ID of the trip to join
 * @param {String} joiningUserID The user ID who is requesting to join
 */
export const join = (tripID, joiningUserID) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['leaders', 'membersUser', 'pendingUser'])
      .then(async (trip) => {
        let joiningUserPender = {};
        // Remove user from pending list
        trip.pending.forEach((pender, index) => {
          if (pender.user._id.toString() === joiningUserID) {
            // eslint-disable-next-line prefer-destructuring
            joiningUserPender = trip.pending.splice(index, 1)[0];
          }
        });

        if (joiningUserPender == null) reject(new Error('This user is not yet on the pending list for this trip'));

        // Add user to member list
        if (!trip.members.some((member) => { return member.user._id.toString() === joiningUserID; })) {
          trip.members.push(joiningUserPender);
        } else reject(new Error('This user is already approved to be on the trip'));

        await calculateRequiredGear(trip);
        await trip.save();
        User.findById(joiningUserID).then((foundUser) => {
          mailer.send({ address: foundUser.email, subject: `Trip ${trip.number}: You've been approved!`, message: `Hello ${foundUser.name},\n\nYou've been approved for [Trip #${trip.number}: ${trip.title}]!\n\nView the trip here: ${constants.frontendURL}/trip/${tripID}\n\nYou can reach the trip leader at ${trip.leaders[0].email}.\n\nBest,\nDOC Planner` });
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: ${foundUser.name} got approved!`, message: `Hello,\n\nYour pending trippee ${foundUser.name} for [Trip #${trip.number}: ${trip.title}] has been approved. You can reach them at ${foundUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
        });
        resolve();
      })
      .catch((error) => { reject(error); });
  });
};

/**
 * Processes request from trippee to leave trip.
 * If the trippee was approved, removes all gear requested by trippee in the group list and sends email alert to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to leave from
 * @param {String} leavingUserID The ID of the user leaving
 */
export const leave = (tripID, leavingUserID) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['leaders', 'membersUser'])
      .then(async (trip) => {
        User.findById(leavingUserID).then((leavingUser) => {
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: ${leavingUser.name} left your trip`, message: `Hello,\n\nYour approved trippee ${leavingUser.name} for [Trip #${trip.number}: ${trip.title}] cancelled for this trip. You can reach them at ${leavingUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
        });
        let userIdx = -1;
        if (trip.pending.some((pender, idx) => {
          if (pender.user._id.toString() === leavingUserID) {
            userIdx = idx;
            return true;
          } else return false;
        })) {
          trip.pending.splice(userIdx, 1);
        } else if (trip.members.some((member, idx) => {
          if (member.user._id.toString() === leavingUserID) {
            userIdx = idx;
            return true;
          } else return false;
        })) {
          trip.members.splice(userIdx, 1);
        }
        await calculateRequiredGear(trip);
        await trip.save();
        resolve();
      })
      .catch((error) => { console.log(error); reject(error); });
  });
};

export const toggleTripLeadership = (req, res) => {
  populateTripDocument(Trip.findById(req.params.tripID), ['leaders', 'membersUser', 'pendingUser'])
    .then(async (trip) => {
      let demoted = false;
      trip.leaders.some((leader, index) => {
        console.log(req.body.member.user);
        if (req.body.member.user.id === leader.id) {
          trip.leaders.splice(index, 1);
          demoted = true;
          sendLeadersEmail(req.params.tripID, `Trip #${trip.number}: co-leader change`, `Hello trip leaders and co-leaders,\n\n${req.body.member.user.name} has been removed as a co-leader for [Trip #${trip.number}: ${trip.title}]. You can reach them at ${req.body.member.user.email}.\n\nYou can view the trip at ${constants.frontendURL}/trip/${req.params.tripID}\n\nEnjoy the outdoors,\nDOC Planner`);
          mailer.send({ address: [req.body.member.user.email], subject: `Trip #${trip.number}: co-leader change`, message: `Hello,\n\nYou have been removed as a co-leader for [Trip #${trip.number}: ${trip.title}]. You can reach them at ${req.body.member.user.email}.\n\nYou can view the trip at ${constants.frontendURL}/trip/${req.params.tripID}\n\nEnjoy the outdoors,\nDOC Planner` });
        }
        return leader._id.equals(req.body.member.user._id);
      });
      if (!demoted) {
        trip.members.some((member) => {
          if (member.user._id.equals(req.body.member.user._id)) {
            trip.leaders.push(member.user);
            sendLeadersEmail(req.params.tripID, `Trip #${trip.number}: new co-leader`, `Hello trip leaders and co-leaders,\n\n${req.body.member.user.name} has been appointed as a co-leader for [Trip #${trip.number}: ${trip.title}]. You can reach them at ${req.body.member.user.email}.\n\nYou can view the trip at ${constants.frontendURL}/trip/${req.params.tripID}\n\nEnjoy the outdoors,\nDOC Planner`);
          }
          return member.user._id.equals(req.body.member.user._id);
        });
      }
      trip.members.forEach((m) => { return console.log(m.user.name); });
      trip.leaders.forEach((m) => { return console.log(m.name); });
      await trip.save();
      res.json(await getTrip(req.params.tripID));
    })
    .catch((error) => {
      console.log(error);
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
 * TRIP STATUS
 */

/**
 * Sets the returned status for the trip.
 * @param {express.req} req
 * @param {express.res} res
 */
export const toggleTripLeftStatus = (req, res) => {
  const { tripID } = req.params;
  const { status } = req.body;
  const now = new Date();
  populateTripDocument(Trip.findById(tripID), ['leaders', 'vehicleRequest'])
    .then(async (trip) => {
      trip.left = status;
      await trip.save();
      if (trip.vehicleRequest) {
        trip.vehicleRequest.assignments.forEach(async (assignmentID) => {
          const assignment = await AssignmentModel.findById(assignmentID);
          assignment.pickedUp = true;
          assignment.save();
        });
      }
      sendLeadersEmail(trip._id, `Trip #${trip.number} ${!status ? 'un-' : ''}left`, `Hello,\n\nYou have marked your Trip #${trip.number}: ${trip.title} as just having ${!status ? 'NOT ' : ''}left ${trip.pickup} at ${constants.formatDateAndTime(now)}, and your trip is due for return at ${constants.formatDateAndTime(trip.endDateAndTime)}.\n\nIMPORTANT: within 90 minutes of returning from this trip, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${trip._id}?token=${tokenForUser(req.user, 'mobile', trip._id)}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Planner`);
      res.json(await getTrip(tripID));
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
  populateTripDocument(Trip.findById(tripID), ['leaders', 'vehicleRequest'])
    .then(async (trip) => {
      trip.returned = status;
      await trip.save();
      if (trip.vehicleRequest) {
        trip.vehicleRequest.assignments.forEach(async (assignmentID) => {
          const assignment = await AssignmentModel.findById(assignmentID);
          assignment.returned = true;
          assignment.save();
        });
      }
      sendLeadersEmail(trip._id, `Trip #${trip.number} ${!status ? 'un-' : ''}returned`, `Hello,\n\nYour Trip #${trip.number}: ${trip.title}, has been marked as ${!status ? 'NOT ' : ''}returned at ${constants.formatDateAndTime(now)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Planner`);
      if (trip.markedLate) { // will inform OPO that the trip has been returned if it had been marked as late (3 hr) before
        mailer.send({ address: constants.OPOEmails, subject: `Trip #${trip.number} ${!status ? 'un-' : ''}returned`, message: `Hello,\n\nTrip #${trip.number}: ${trip.title}, has was marked as LATE, has now been marked as ${!status ? 'NOT' : ''} returned by the leader at ${constants.formatDateAndTime(now)}. Trip details can be found at:\n\n${constants.frontendURL}/trip/${trip._id}\n\nWe hope you enjoyed the outdoors!\n\nBest,\nDOC Planner` });
      }
      res.json(await getTrip(tripID));
    }).catch((error) => { return res.status(500).json(error); });
};

/**
 * TRIP REQUESTS
 */

/**
 * OPO approves or denies a trip's general gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export const respondToGearRequest = (tripID, status) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['leaders'])
      .then(async (trip) => {
        trip.gearStatus = status;
        await trip.save();
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        let message;
        switch (status) {
          case 'approved':
            message = 'got approved';
            break;
          case 'denied':
            message = 'got denied';
            break;
          case 'pending':
            message = 'was un-approved, pending again';
            break;
          default:
            break;
        }
        mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: Gear requests ${message}`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title}'s group gear requests ${message} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${tripID}\n\nBest,\nDOC Planner` });
        resolve(await getTrip(tripID));
      })
      .catch((error) => { reject(error); });
  });
};

/**
 * OPO approves or denies a trip's trippee gear requests.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {String} tripID The ID of the trip to edit status
 * @param {String} status String value of the new status
 */
export const respondToTrippeeGearRequest = (tripID, status) => {
  return new Promise((resolve, reject) => {
    populateTripDocument(Trip.findById(tripID), ['leaders'])
      .then(async (trip) => {
        trip.trippeeGearStatus = status;
        await trip.save();
        let message;
        switch (status) {
          case 'approved':
            message = 'got approved';
            break;
          case 'denied':
            message = 'got denied';
            break;
          case 'pending':
            message = 'was un-approved, pending again';
            break;
          default:
            break;
        }
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: Gear requests ${message}`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title}'s trippee (not group) gear requests ${message} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${tripID}\n\nBest,\nDOC Planner` });
        resolve(await getTrip(tripID));
      }).catch((error) => { console.log(error.message); reject(error); });
  });
};

/**
 * OPO assigns a P-Card to a trip or denies.
 * Sends notification email to all trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const respondToPCardRequest = (req, res) => {
  populateTripDocument(Trip.findById(req.params.tripID), ['leaders'])
    .then(async (trip) => {
      trip.pcardStatus = req.body.pcardStatus;
      trip.pcardAssigned = req.body.pcardAssigned;
      await trip.save();
      const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
      mailer.send({ address: leaderEmails, subject: `Trip ${trip.number}: P-Card requests got ${req.body.status ? 'approved!' : 'denied'}`, message: `Hello,\n\nYour Trip #${trip.number}: ${trip.title} has gotten its P-Card requests ${req.body.status ? 'approved' : 'denied'} by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
      res.json(await getTrip(req.params.tripID));
    }).catch((error) => {
      res.status(500).send(error);
    });
};
