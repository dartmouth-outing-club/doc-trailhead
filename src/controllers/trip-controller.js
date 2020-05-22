import Trip from '../models/trip-model';
import User from '../models/user-model';
import Club from '../models/club-model';
import Global from '../models/global-model';
import VehicleRequest from '../models/vehicle-request-model';
import { tokenForUser } from './user-controller';
import * as constants from '../constants';
import { mailer } from '../services';

export const createTrip = (req, res) => {
  Global.find({}).then((globals) => {
    // Retrieves the current maximum trip number and then updates it immediately.
    const currentMaxTripNumber = globals[0].tripNumberMax + 1;
    globals[0].tripNumberMax += 1;
    globals[0].save().then(() => {
      const trip = new Trip();
      trip.number = currentMaxTripNumber;
      trip.startDate = req.body.startDate;
      trip.endDate = req.body.endDate;
      trip.startTime = req.body.startTime;
      trip.endTime = req.body.endTime;
      trip.title = req.body.title;
      trip.description = req.body.description;
      trip.club = req.body.club;
      trip.cost = req.body.cost;
      trip.experienceNeeded = req.body.experienceNeeded;
      trip.location = req.body.location;
      trip.pickup = req.body.pickup;
      trip.dropoff = req.body.dropoff;
      trip.mileage = req.body.mileage;
      trip.co_leader_access = req.body.co_leader_access;
      trip.OPOGearRequests = req.body.gearRequests;
      trip.trippeeGear = req.body.trippeeGear;
      trip.pcard = req.body.pcard;

      if (req.body.gearRequests.length > 0) {
        trip.gearStatus = 'pending';
      }
      if (req.body.trippeeGear.length > 0) {
        trip.trippeeGearStatus = 'pending';
      }
      if (req.body.pcard.length > 0) {
        trip.pcardStatus = 'pending';
      }

      trip.members = [{ user: req.user._id, gear: {} }];
      trip.leaders = [req.user._id];
      trip.pending = [];

      const leaderEmails = [req.user.email];

      User.find({ email: { $in: req.body.leaders } }).then((foundUsers) => {
        Promise.all(foundUsers.map((user) => {
          return new Promise((resolve) => {
            if (!user._id.equals(req.user._id)) {
              trip.leaders.push(user._id);
              trip.members.push({ user: user._id, gear: {} });
              leaderEmails.push(user.email);
            }
            resolve();
          });
        })).then(() => {
          trip.save().then((savedTrip) => {
            mailer.send({ address: leaderEmails, subject: `New Trip #${savedTrip.number} created`, message: `Hello,\n\nYou've created a new Trip #${savedTrip.number}: ${savedTrip.title}! You will receive email notifications when trippees sign up.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nIMPORTANT: on the day of the trip, you must check-in all attendees here: ${constants.frontendURL}/trip-check-in/${savedTrip._id}?token=${tokenForUser(req.user, 'mobile', savedTrip._id)}\n\nBest,\nDOC Planner` });

            if (req.body.vehicles.length > 0) {
              Global.find({}).then((globalsForVehicleRequest) => {
                // Retrieves the current maximum vehicle request number and then updates it immediately.
                const currentMaxVehicleRequestNumberglobals = globals[0].vehicleRequestNumberMax + 1;
                globalsForVehicleRequest[0].vehicleRequestNumberMax += 1;
                globalsForVehicleRequest[0].save().then(() => {
                  const vehicleRequest = new VehicleRequest();
                  vehicleRequest.number = currentMaxVehicleRequestNumberglobals;
                  vehicleRequest.requester = req.user._id;
                  vehicleRequest.mileage = req.body.mileage;
                  vehicleRequest.requestDetails = req.body.description;
                  vehicleRequest.associatedTrip = savedTrip._id;
                  vehicleRequest.requestType = 'TRIP';
                  vehicleRequest.requestedVehicles = req.body.vehicles;
                  vehicleRequest.save().then((savedVehicleRequest) => {
                    Trip.findById(savedTrip._id).then((recentlyCreatedTrip) => {
                      recentlyCreatedTrip.vehicleStatus = 'pending';
                      recentlyCreatedTrip.vehicleRequest = savedVehicleRequest;
                      recentlyCreatedTrip.save().then(() => {
                        res.json(savedVehicleRequest);
                      });
                    });
                  }).catch((error) => { res.status(500).json({ message: 'Trip successfully created, but error creating associated vehicle request for trip.', error, trip: savedTrip }); });
                });
              });
            } else res.json(savedTrip);
          });
        });
      }).catch((error) => {
        console.log(error);
      });
    });
  });
};

export const getTrips = (req, res) => {
  Trip.find().populate('club').populate('leaders')
    .then((trips) => {
      res.json(trips);
    })
    .catch((error) => {
      res.status(500).send(error);
    });
};

export const getTrip = (req, res) => {
  Trip.findById(req.params.id).populate('club').populate('leaders').populate('vehicleRequest')
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
    .then((trip) => {
      const isPending = trip.pending.some((pender) => {
        return pender.user.equals(req.user.id);
      });

      const isOnTrip = trip.members.some((member) => {
        return member.user.id === req.user.id;
      });

      let userTripStatus = '';
      if (isPending) {
        userTripStatus = 'PENDING';
      } else if (isOnTrip) {
        userTripStatus = 'APPROVED';
      } else {
        userTripStatus = 'NONE';
      }

      // The commeneted version will give co-leaders leader access to the trip regardless of their roles
      let isLeaderOnTrip;
      if (trip.co_leader_access) {
        isLeaderOnTrip = trip.leaders.some((leader) => {
          return leader._id.equals(req.user.id);
        });
      } else {
        isLeaderOnTrip = trip.leaders[0]._id.equals(req.user.id);
      }

      res.json({ trip, userTripStatus, isLeaderOnTrip });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error);
    });
};

/**
 * Puts a trippee on the pending list.
 * Sends an email confirmation to trippee and notice to all leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const addToPending = (req, res) => {
  const { id } = req.params;
  const { trippeeGear } = req.body;
  Trip.findById(id)
    .populate('leaders')
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

export const editUserGear = (req, res) => {
  const { id } = req.params;
  const { trippeeGear } = req.body;
  Trip.findById(id).exec()
    .then((trip) => {
      trip.pending.some((pender) => {
        if (pender.user._id.equals(req.user._id)) {
          pender.gear = trippeeGear;
        }
        return pender.user._id.equals(req.user._id);
      });
      trip.save()
        .then(() => {
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
 * @param {*} req
 * @param {*} res
 */
export const joinTrip = (req, res) => {
  const { id } = req.params;
  const { pend } = req.body;
  Trip.findById(id)
    .populate('leaders')
    .then((trip) => {
      // add user to member list
      trip.members.push(pend);
      pend.gear.forEach((pendGear) => {
        trip.trippeeGear.forEach((gear) => {
          if (pendGear.gearId === gear._id.toString()) {
            gear.quantity += 1;
          }
        });
      });
      // remove user from pending list
      trip.pending.forEach((pender, index) => {
        if (pender._id.equals(pend._id)) {
          trip.pending.splice(index, 1);
        }
      });
      trip.save()
        .then(() => {
          User.findById(pend.user).then((foundUser) => {
            mailer.send({ address: foundUser.email, subject: 'Trip Update: You\'ve been approved!', message: `Hello ${foundUser.name},\n\nYou've been approved for Trip #${trip.number}: ${trip.title}!\n\nView the trip here: ${constants.frontendURL}/trip/${id}\n\nYou can reach the trip leader at ${trip.leaders[0].email}.\n\nBest,\nDOC Planner` });
            const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
            mailer.send({ address: leaderEmails, subject: `Trip Update: ${foundUser.name} got approved!`, message: `Hello,\n\nYour pending trippee ${foundUser.name} for Trip #${trip.number}: ${trip.title} has been approved. You can reach them at ${foundUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          });
          getTrip(req, res);
        });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).send(error.message);
    });
};

/**
 * Sets the attending status for each member of trip.
 * @param {*} req
 * @param {*} res
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
            member.attendedTrip = status;
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
 * Moves a currently approved trippee to the pending list.
 * Removes trippees gear requests from the group list.
 * Sends all trip leaders and co-leaders a notification email.
 * @param {*} req
 * @param {*} res
 */
export const moveToPending = (req, res) => {
  Trip.findById(req.params.id)
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
          // decrement all gear requests made by the user by 1 from the group list
          member.gear.forEach((memberGear) => {
            trip.trippeeGear.forEach((gear) => {
              if (memberGear.gearId === gear._id) {
                gear.quantity -= 1;
              }
            });
          });
          trip.members.splice(index, 1); // remove the trippee from the member list
        }
        return member.user.id === req.body.member.user.id;
      });
      trip.pending.push(req.body.member);
      trip.save()
        .then(() => {
          const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
          mailer.send({ address: leaderEmails, subject: `Trip Update: ${req.body.member.user.name} moved back to pending`, message: `Hello,\n\nYour approved trippee ${req.body.member.name} for Trip #${trip.number}: ${trip.title} has been moved from the approved list to the pending list. You can reach them at ${req.body.member.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
          getTrip(req, res);
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
  Trip.findById(req.params.id)
    .populate('leaders')
    .populate({
      path: 'members.user',
      model: 'User',
    }).then((trip) => {
      console.log(trip);
      User.findById(req.user.id).then((leavingUser) => {
        const leaderEmails = trip.leaders.map((leader) => { return leader.email; });
        mailer.send({ address: leaderEmails, subject: `Trip Update: ${leavingUser.name} left your trip`, message: `Hello,\n\nYour approved trippee ${leavingUser.name} for Trip #${trip.number}: ${trip.title} cancelled for this trip. You can reach them at ${leavingUser.email}.\n\nView the trip here: ${constants.frontendURL}/trip/${trip._id}\n\nBest,\nDOC Planner` });
      });
      if (req.body.userTripStatus === 'APPROVED') { // trippee was originally approved to attend
        trip.members.some((member, index) => {
          if (member.user._id.equals(req.user._id)) { // find trippee in list of members
            // match and reduce each gear request by 1
            member.gear.forEach((memberGear) => {
              trip.trippeeGear.forEach((gear) => {
                if (memberGear.gearId === gear._id) {
                  gear.quantity -= 1;
                }
              });
            });
            trip.members.splice(index, 1); // remove trippee
          }
          return member.user._id.equals(req.user._id);
        });
      } else if (req.body.userTripStatus === 'PENDING') {
        trip.pending.some((pender, index) => {
          if (pender.user._id.equals(req.user._id)) {
            trip.pending.splice(index, 1); // remove trippee
          }
          return pender.user._id.equals(req.user._id);
        });
      }
      trip.save().then(() => {
        getTrip(req, res);
      });
    })
    .catch((error) => {
      res.status(500).send(error.message);
    });
};

export const deleteTrip = (req, res) => {
  Trip.findById(req.params.id, (err, trip) => {
    if (err) {
      res.json({ error: err });
    } else if (trip.leaders.indexOf(req.user._id) > -1) {
      Trip.deleteOne({ _id: req.params.id }, (err) => {
        if (err) {
          res.json({ error: err });
        } else {
          res.json({ message: 'removed successfully' });
        }
      });
    } else {
      res.status(422).send('You must be a leader on the trip');
    }
  });
};

export const updateTrip = async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id).exec();
    if (trip.leaders.indexOf(req.user._id) !== -1 || req.user.role === 'OPO') {
      trip.startDate = req.body.startDate;
      trip.endDate = req.body.endDate;
      trip.startTime = req.body.startTime;
      trip.endTime = req.body.endTime;
      trip.title = req.body.title;
      trip.description = req.body.description;
      trip.co_leader_access = req.body.co_leader_access;
      trip.club = req.body.club;
      trip.mileage = req.body.mileage;
      trip.location = req.body.location;
      trip.pickup = req.body.pickup;
      trip.dropoff = req.body.dropoff;
      trip.cost = req.body.cost;
      trip.experienceNeeded = req.body.experienceNeeded;
      trip.OPOGearRequests = req.body.gearRequests;
      trip.trippeeGear = req.body.trippeeGear;
      trip.pcard = req.body.pcard;
      trip.returned = req.body.returned;
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

export const getGearRequests = (req, res) => {
  Trip.find({ gearStatus: { $not: { $in: ['N/A'] } } }).populate('leaders').populate('club').populate({
    path: 'members.user',
    model: 'User',
  })
    .exec()
    .then((gearRequests) => {
      return res.json(gearRequests);
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
      req.params.id = req.body.id;
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
