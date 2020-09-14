/* eslint-disable no-unreachable */
import VehicleRequest from '../models/vehicle-request-model';
import Vehicle from '../models/vehicle-model';
import Assignment from '../models/assignment-model';
import Trip from '../models/trip-model';
import User from '../models/user-model';
import Global from '../models/global-model';
import * as constants from '../constants';
import { mailer } from '../services';

export const makeVehicleRequest = (req, res) => {
  Global.find({}).then((globals) => {
    // Retrieves the current maximum vehicle request number and then updates it immediately.
    const currentMaxVehicleRequestNumberglobals = globals[0].vehicleRequestNumberMax + 1;
    globals[0].vehicleRequestNumberMax += 1;
    globals[0].save().then(() => {
      const vehicleRequest = new VehicleRequest();
      vehicleRequest.number = currentMaxVehicleRequestNumberglobals;
      vehicleRequest.requester = req.body.requester;
      vehicleRequest.requestDetails = req.body.requestDetails;
      vehicleRequest.mileage = req.body.mileage;
      vehicleRequest.noOfPeople = req.body.noOfPeople;
      vehicleRequest.requestType = req.body.requestType;
      vehicleRequest.requestedVehicles = req.body.requestedVehicles.map((requestedVehicle) => { return { ...requestedVehicle, pickupDateAndTime: constants.createDateObject(requestedVehicle.pickupDate, requestedVehicle.pickupTime), returnDateAndTime: constants.createDateObject(requestedVehicle.returnDate, requestedVehicle.returnTime) }; });
      vehicleRequest.save().then(async (savedRequest) => {
        const requester = await User.findById(vehicleRequest.requester);
        mailer.send({ address: [requester.email], subject: `New V-Req #${savedRequest.number} created`, message: `Hello,\n\nYou've created a new vehicle request, V-Req #${savedRequest.number}: ${savedRequest.requestDetails}! You will receive email notifications when it is approved by OPO staff.\n\nView the request here: ${constants.frontendURL}/vehicle-request/${savedRequest._id}\n\nThis request is not associated with any trip.\n\nBest,\nDOC Planner` });
        res.json(savedRequest);
      }).catch((error) => {
        res.status(500).send(error);
        console.log(error);
      });
    });
  });
};

export const getVehicleRequest = (req, res) => {
  VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip').populate('assignments')
    .populate({
      path: 'requester',
      populate: {
        path: 'leader_for',
        model: 'Club',
      },
    })
    .populate({
      path: 'assignments',
      populate: {
        path: 'assigned_vehicle',
        model: 'Vehicle',
      },
    })
    .exec()
    .then((vehicleRequest) => {
      res.json(vehicleRequest);
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};

export const getVehicleRequests = (req, res) => {
  VehicleRequest.find({}).populate('requester').populate('associatedTrip').populate('assignments')
    .then((vehicleRequests) => {
      res.json(vehicleRequests);
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};

export const updateVehicleRequest = (req, res) => {
  VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip')
    .then((vehicleRequest) => {
      if (vehicleRequest.status !== 'pending') {
        res.status(400).send('Only pending requests can be updated');
      } else {
        vehicleRequest.requester = req.body.requester;
        vehicleRequest.requestDetails = req.body.requestDetails;
        vehicleRequest.requestType = req.body.requestType;
        vehicleRequest.requestedVehicles = req.body.requestedVehicles;
        vehicleRequest.save()
          .then((savedRequest) => {
            return res.json(savedRequest);
          })
          .catch((error) => {
            res.status(500).send(error);
            console.log(error);
          });
      }
    });
};

export const deleteVehicleRequest = async (vehicleRequestID, reason) => {
  const request = await VehicleRequest.findById(vehicleRequestID)
    .populate({ path: 'assignments', populate: { path: 'assigned_vehicle' } }).exec();
  if (request.assignments) {
    for (let i = 0; i < request.assignments.length; i += 1) {
      await Assignment.deleteOne({ _id: request.assignments[i]._id });
    }
    mailer.send({ address: constants.OPOEmails, subject: `V-Req #${request.number} deleted`, message: `Hello,\n\nThe V-Req #${request.number} has been deleted.\n\nReason: ${reason || 'no reason provided.'}\n\nIt had ${request.assignments.length} approved vehicle assignments, all of which have been unscheduled so that the vehicles can be assigned to other trips.\n\nDeleted assignments:\n${request.assignments.map((assignment) => { return `\t-\t${assignment.assigned_vehicle.name}: ${assignment.assigned_pickupDateAndTime} to ${assignment.assigned_returnDateAndTime}\n`; })}\n\nBest, DOC Planner` });
  }
  await VehicleRequest.deleteOne({ _id: vehicleRequestID });
  recomputeAllConflicts();
};

/**
 * Checks a given `proposedAssignment` against the current database of assignments for conflicts, return the `_id`s of those conflicts.
 * @param {Assignment} proposedAssignment
 */
const checkForConflicts = (proposedAssignment) => {
  return new Promise((resolve) => {
    Assignment.find({}).then((assignments) => {
      assignments = assignments.filter(((assignment) => {
        const conflictingVehicles = proposedAssignment.assigned_vehicle._id.equals(assignment.assigned_vehicle._id);
        if (proposedAssignment._id) {
          return (!assignment._id.equals(proposedAssignment._id)) && conflictingVehicles;
        } else return conflictingVehicles;
      }));
      assignments.sort((a1, a2) => {
        if (a1.assigned_pickupDateAndTime < a2.assigned_pickupDateAndTime) return -1;
        else if (a1.assigned_pickupDateAndTime > a2.assigned_pickupDateAndTime) return 1;
        else return 0;
      });
      const conflicts = [];
      Promise.all(
        assignments.map((assignment) => {
          return new Promise((resolve) => {
            if (!((
              assignment.assigned_pickupDateAndTime <= proposedAssignment.assigned_pickupDateAndTime
               && assignment.assigned_returnDateAndTime <= proposedAssignment.assigned_pickupDateAndTime
            ) || (
              assignment.assigned_pickupDateAndTime >= proposedAssignment.assigned_returnDateAndTime
               && assignment.assigned_returnDateAndTime >= proposedAssignment.assigned_returnDateAndTime
            ))) {
              conflicts.push(assignment._id);
            }
            resolve();
          });
        }),
      ).then(() => {
        resolve(conflicts);
      });
    });
  });
};

/**
* Cross-checks every assignment with every other assignment and updates the `conflict` parameter for each assignment.
*/
function recomputeAllConflicts() {
  return new Promise((resolve, reject) => {
    Assignment.find({}).then((assignments) => {
      assignments.filter((assignment) => { return assignment.assignedVehicle !== 'Enterprise'; });
      assignments.sort((a1, a2) => {
        if (a1.assigned_pickupDateAndTime < a2.assigned_pickupDateAndTime) return -1;
        else if (a1.assigned_pickupDateAndTime > a2.assigned_pickupDateAndTime) return 1;
        else return 0;
      });
      Promise.all(
        assignments.map((assignment, index, array) => {
          return new Promise((resolve, reject) => {
            assignment.conflicts = [];
            // console.log('\tpivot', assignment._id);
            console.log('\tpivot index', index);
            console.log('\tmax length', array.length);
            let traverser = index + 1;
            while (traverser < array.length) {
              console.log('\t\tcompare index', traverser);
              // console.log('\t\ttraverser', array[traverser]._id);
              // console.log('\t\t\tcompareFrom', assignment.assigned_returnDateAndTime);
              // console.log('\t\t\tcompareTo', array[traverser].assigned_pickupDateAndTime);
              console.log('\t\t\tdecision', assignment.assigned_returnDateAndTime > array[traverser].assigned_pickupDateAndTime);
              if (assignment.assigned_returnDateAndTime > array[traverser].assigned_pickupDateAndTime) {
                // console.log('\t\t\t\t', array[traverser]._id);

                // Array.from(new Set(conflicts)) instead
                console.log('\t\t\t\tincludes', !assignment.conflicts.includes(array[traverser]._id));
                if (!assignment.conflicts.includes(array[traverser]._id)) {
                  assignment.conflicts.push(array[traverser]._id);
                }
                // Assignment.findById(array[traverser]._id).then((conflictingAssignment) => {
                //   if (!conflictingAssignment.conflicts.includes(assignment._id)) {
                //     conflictingAssignment.conflicts.push(assignment._id);
                //     conflictingAssignment.save();
                //   }
                // });
              }
              traverser += 1;
            }
            assignment.save().then((savedAssignment) => {
              // console.log(savedAssignment.conflicts);
              resolve();
            });
          });
        }),
      ).then(() => {
        Assignment.find({}).then((assignmentsForBackChecking) => {
          Promise.all(
            assignmentsForBackChecking.map((pivot) => {
              return new Promise((resolve, reject) => {
                Promise.all(
                  pivot.conflicts.map((compare_id) => {
                    return new Promise((resolve, reject) => {
                      Assignment.findById(compare_id).then((compare) => {
                        if (!compare.conflicts.includes(pivot._id)) {
                          compare.conflicts.push(pivot._id);
                        }
                        compare.save(() => {
                          resolve();
                        });
                      });
                    });
                  }),
                ).then(() => { return resolve(); });
              });
            }),
          ).then(() => {
            resolve();
          });
        });
        // resolve();
      });
    });
  });
}

/**
 * Router-connected function that prepares a `proposedAssignment` not yet assigned to be checked for potential conflicts.
 * @param {*} req
 * @param {*} res
 */
export const precheckAssignment = (req, res) => {
  Vehicle.findOne({ name: req.body.assignedVehicle }).populate('bookings').exec().then((vehicle) => {
    const proposedAssignment = {};

    proposedAssignment.assigned_vehicle = vehicle;
    // setting pickup times
    proposedAssignment.assigned_pickupDate = req.body.pickupDate;
    proposedAssignment.assigned_pickupTime = req.body.pickupTime;
    const pickupDateAndTime = constants.createDateObject(req.body.pickupDate, req.body.pickupTime);
    proposedAssignment.assigned_pickupDateAndTime = pickupDateAndTime;
    // setting return times
    proposedAssignment.assigned_returnDate = req.body.returnDate;
    proposedAssignment.assigned_returnTime = req.body.returnTime;
    const returnDateAndTime = constants.createDateObject(req.body.returnDate, req.body.returnTime);
    proposedAssignment.assigned_returnDateAndTime = returnDateAndTime;

    checkForConflicts(proposedAssignment).then((conflictingAssignments) => {
      Promise.all(conflictingAssignments.map((conflicting_assignment_id) => {
        return new Promise(((resolve) => {
          Assignment.findById(conflicting_assignment_id).then((conflicting_assignment) => {
            resolve({ request: conflicting_assignment.request, start: conflicting_assignment.assigned_pickupDateAndTime, end: conflicting_assignment.assigned_returnDateAndTime });
          });
        }));
      })).then((conflicts) => {
        Promise.all(conflicts.map(((conflict) => {
          return new Promise((resolve) => {
            VehicleRequest.findById(conflict.request).then((conflicting_request) => {
              if (conflicting_request.associatedTrip != null) {
                Trip.findById(conflicting_request.associatedTrip).then((conflicting_trip) => {
                  // const parseStartDate = conflicting_trip.startDate.toString().split(' ');
                  // const parseEndDate = conflicting_trip.endDate.toString().split(' ');
                  // const time = { start: `${parseStartDate[1]} ${parseStartDate[2]}, ${conflicting_trip.startTime}`, end: `${parseEndDate[1]} ${parseEndDate[2]}, ${conflicting_trip.endTime}` };
                  resolve({
                    message: `TRIP #${conflicting_trip.number}`, time: { start: conflict.start, end: conflict.end }, objectID: conflicting_request._id, type: 'TRIP',
                  });
                });
              } else {
                resolve({
                  message: `V-Req #${conflicting_request.number}`, time: { start: conflict.start, end: conflict.end }, objectID: conflicting_request._id, type: 'V_REQ',
                });
              }
            });
          });
        }))).then((conflicts_annotated) => {
          res.json(conflicts_annotated);
        });
      });
    });
  });
};

/**
 * Saves a single `proposedAssignment` to the database.
 * @param {String} vehicleRequest
 * @param {Assignment} proposedAssignment
 */
const processAssignment = (vehicleRequest, proposedAssignment) => {
  return new Promise(async (resolve) => {
    Vehicle.findOne({ name: proposedAssignment.assignedVehicle }).populate('bookings').then((vehicle) => {
      if (proposedAssignment.existingAssignment) {
        Assignment.findById(proposedAssignment.id).populate('assigned_vehicle').then((existingAssignment) => {
        // setting pickup times
          existingAssignment.assigned_pickupDate = proposedAssignment.pickupDate;
          existingAssignment.assigned_pickupTime = proposedAssignment.pickupTime;
          const pickupDateAndTime = constants.createDateObject(proposedAssignment.pickupDate, proposedAssignment.pickupTime);
          existingAssignment.assigned_pickupDateAndTime = pickupDateAndTime;
          // setting return times
          existingAssignment.assigned_returnDate = proposedAssignment.returnDate;
          existingAssignment.assigned_returnTime = proposedAssignment.returnTime;
          const returnDateAndTime = constants.createDateObject(proposedAssignment.returnDate, proposedAssignment.returnTime);
          existingAssignment.assigned_returnDateAndTime = returnDateAndTime;

          existingAssignment.assigned_key = proposedAssignment.assignedKey;
          existingAssignment.pickedUp = proposedAssignment.pickedUp;
          existingAssignment.returned = proposedAssignment.returned;
          console.log('original', existingAssignment.assigned_vehicle.name);
          console.log('after', proposedAssignment.assignedVehicle);
          console.log(existingAssignment.assigned_vehicle.name !== proposedAssignment.assignedVehicle);
          if (existingAssignment.assigned_vehicle.name !== proposedAssignment.assignedVehicle) {
            vehicle.bookings.push(existingAssignment);
            vehicle.save().then(() => {
              Vehicle.updateOne({ _id: existingAssignment.assigned_vehicle._id }, { $pull: { bookings: existingAssignment._id } }); // remove assignment from previously assigned vehicle
            });
          }
          existingAssignment.assigned_vehicle = vehicle;
          existingAssignment.save().then((updatedAssignment) => {
            resolve(updatedAssignment);
          });
        });
      } else {
        const newAssignment = new Assignment();
        // setting basic info
        newAssignment.request = vehicleRequest;
        newAssignment.assigned_vehicle = vehicle;
        newAssignment.requester = vehicleRequest.requester;
        newAssignment.assigned_key = proposedAssignment.assignedKey;
        newAssignment.responseIndex = proposedAssignment.responseIndex;
        // setting pickup times
        newAssignment.assigned_pickupDate = proposedAssignment.pickupDate;
        newAssignment.assigned_pickupTime = proposedAssignment.pickupTime;
        const pickupDateAndTime = constants.createDateObject(proposedAssignment.pickupDate, proposedAssignment.pickupTime);
        newAssignment.assigned_pickupDateAndTime = pickupDateAndTime;
        // setting return times
        newAssignment.assigned_returnDate = proposedAssignment.returnDate;
        newAssignment.assigned_returnTime = proposedAssignment.returnTime;
        const returnDateAndTime = constants.createDateObject(proposedAssignment.returnDate, proposedAssignment.returnTime);
        newAssignment.assigned_returnDateAndTime = returnDateAndTime;

        newAssignment.save().then((savedAssignment) => {
          vehicle.bookings.push(savedAssignment);
          vehicle.save().then(() => {
            checkForConflicts(savedAssignment).then((conflicts) => {
              Promise.all(
                conflicts.map((conflict_id) => {
                  return new Promise((resolve, reject) => {
                    Assignment.findById(conflict_id).then((conflictingAssignment) => {
                      conflictingAssignment.conflicts.push(savedAssignment._id);
                      conflictingAssignment.save().then(() => { return resolve(); });
                    });
                  });
                }),
              ).then(() => {
                console.log(100);
                savedAssignment.conflicts = conflicts;
                savedAssignment.save().then((updatedSavedAssignment) => {
                  resolve(updatedSavedAssignment);
                });
              });
            });
          });
        });
      }
    });
  });
};

/**
 * Asynchronously processes all `proposedAssignments`.
 * @param {Assignment} proposedAssignments
 * @param {String} vehicleRequest
 */
const processAllAssignments = async (proposedAssignments, vehicleRequest) => {
  const processedAssignments = [];
  for (let i = 0; i < proposedAssignments.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await processAssignment(vehicleRequest, proposedAssignments[i], i).then((processedAssignment) => {
      processedAssignments.push(processedAssignment);
    });
  }
  return processedAssignments;
};

export const respondToVehicleRequest = async (req, res) => {
  try {
    VehicleRequest.findById(req.params.id).exec().then((vehicleRequest) => {
      const proposedAssignments = req.body.assignments;
      console.log(1);
      processAllAssignments(proposedAssignments, vehicleRequest).then(async (processedAssignments) => {
        console.log(2);
        const invalidAssignments = processedAssignments.filter((assignment) => {
          return assignment.error;
        });
        vehicleRequest.assignments = processedAssignments;
        vehicleRequest.status = 'approved';
        const requester = await User.findById(vehicleRequest.requester).exec();
        const email = { address: [requester.email], subject: '', message: '' };
        console.log(3);
        if (vehicleRequest.requestType === 'TRIP') {
          const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).populate('leaders').exec();
          associatedTrip.vehicleStatus = 'approved';
          await associatedTrip.save(); // needs await because of multi-path async
          email.address = email.address.concat(associatedTrip.leaders.map((leader) => { return leader.email; }));
          email.subject = 'Trip Update: Your vehicle requests got approved';
          email.message = `Hello,\n\nYour Trip #${associatedTrip.number}'s vehicle request has been approved by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${associatedTrip._id}\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Planner`;
        }
        console.log(4);
        email.subject = 'Your vehicle requests got approved';
        email.message = `Hello,\n\nYour vehicle request #${vehicleRequest.number} has been approved by OPO staff.\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Planner`;
        mailer.send(email);
        console.log(5);
        vehicleRequest.save().then((savedVehicleRequest) => {
          console.log(6);
          VehicleRequest.findById(savedVehicleRequest.id).populate('requester')
            .populate('associatedTrip')
            .populate('assignments')
            .populate({
              path: 'requester',
              populate: {
                path: 'leader_for',
                model: 'Club',
              },
            })
            .populate({
              path: 'assignments',
              populate: {
                path: 'assigned_vehicle',
                model: 'Vehicle',
              },
            })
            .exec()
            .then((updatedVehicleRequest) => {
              console.log(7);
              const output = (invalidAssignments.length === 0) ? { updatedVehicleRequest } : { updatedVehicleRequest, invalidAssignments };
              return res.json(output);
            });
        });
      });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

/**
 * OPO denies a vehicle request.
 * Sends notice to trip leaders and co-leaders.
 * @param {*} req
 * @param {*} res
 */
export const denyVehicleRequest = async (req, res) => {
  try {
    const vehicleRequest = await VehicleRequest.findById(req.params.id).populate('requester').exec();
    const requester = await User.findById(vehicleRequest.requester).exec();
    const email = { address: [requester.email], subject: '', message: '' };
    vehicleRequest.status = 'denied';
    if (vehicleRequest.requestType === 'TRIP') {
      const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).populate('leaders').exec();
      associatedTrip.vehicleStatus = 'denied';
      email.address = email.address.concat(associatedTrip.leaders.map((leader) => { return leader.email; }));
      email.subject = 'Trip Update: Your vehicle requests got denied';
      email.message = `Hello,\n\nYour Trip #${associatedTrip.number}'s vehicle request has been denied by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${associatedTrip._id}\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Planner`;
      await associatedTrip.save();
    }
    await vehicleRequest.save();
    email.subject = 'Your vehicle requests got denied';
    email.message = `Hello,\n\nYour vehicle request #${vehicleRequest.number} has been denied by OPO staff.\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Planner`;
    mailer.send(email);
    const updatedVehicleRequest = await VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip').populate('assignments')
      .populate({
        path: 'requester',
        populate: {
          path: 'leader_for',
          model: 'Club',
        },
      })
      .populate({
        path: 'assignments',
        populate: {
          path: 'assigned_vehicle',
          model: 'Vehicle',
        },
      })
      .exec();
    return res.json({ updatedVehicleRequest });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

export const getVehicleAssignments = async (req, res) => {
  try {
    const assignments = await Assignment.find().populate('requester').populate({ path: 'request', populate: { path: 'associatedTrip', populate: { path: 'leaders' } } }).populate('assigned_vehicle')
      .exec();
    return res.json(assignments);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};

export const cancelAssignments = async (req, res) => {
  try {
    const { toBeDeleted } = req.body.deleteInfo;
    await Promise.all(toBeDeleted.map(async (id) => {
      const assignment = await Assignment.findById(id);
      await Vehicle.updateOne({ _id: assignment.assigned_vehicle }, { $pull: { bookings: assignment._id } }); // remove from vehicle bookings
      await VehicleRequest.updateOne({ _id: assignment.request }, { $pull: { assignments: assignment._id } }); // remove from vehicle request assignments
      const vehicleRequest = await VehicleRequest.findById(assignment.request);
      const requester = await User.findById(vehicleRequest.requester).exec();
      const email = { address: [requester.email], subject: '', message: '' };
      if (vehicleRequest.assignments.length === 0) {
        vehicleRequest.status = 'denied';
        if (vehicleRequest.requestType === 'TRIP') {
          const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).exec();
          associatedTrip.vehicleStatus = 'denied';
          email.address = email.address.concat(associatedTrip.leaders.map((leader) => { return leader.email; }));
          email.subject = 'Trip Update: Your vehicle requests have been cancelled';
          email.message = `Hello,\n\nYour Trip #${associatedTrip.number}'s vehicle request has been cancelled by OPO staff.\n\nView the trip here: ${constants.frontendURL}/trip/${associatedTrip._id}\n\nView the v-request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Planner`;
          await associatedTrip.save();
        }
      }
      email.subject = 'Your vehicle requests got cancelled';
      email.message = `Hello,\n\nYour V-Req #${vehicleRequest.number}'s assignments have been cancelled by OPO staff.\n\nView the vehicle request here: ${constants.frontendURL}/vehicle-request/${vehicleRequest._id}\n\nBest,\nDOC Planner`;
      mailer.send(email);
      await vehicleRequest.save();
    }));
    await Assignment.deleteMany({ _id: { $in: toBeDeleted } });
    const updatedVehicleRequest = await VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip').populate('assignments')
      .populate({
        path: 'requester',
        populate: {
          path: 'leader_for',
          model: 'Club',
        },
      })
      .populate({
        path: 'assignments',
        populate: {
          path: 'assigned_vehicle',
          model: 'Vehicle',
        },
      })
      .exec();
    return res.json({ updatedVehicleRequest });
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};
