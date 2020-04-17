import VehicleRequest from '../models/vehicle_request_model';
import Vehicle from '../models/vehicle_model';
import Assignment from '../models/assignment_model';
import Trip from '../models/trip_model';

const createDateObject = (date, time) => {
  // adapted from https://stackoverflow.com/questions/2488313/javascripts-getdate-returns-wrong-date
  const parts = date.toString().match(/(\d+)/g);
  const splitTime = time.split(':');
  return new Date(parts[0], parts[1] - 1, parts[2], splitTime[0], splitTime[1]);
};

/**
 * Cross-checks every assignment with every other assignment and updates the `conflict` parameter for each assignment.
 */
const recomputeAllConflicts = () => {
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
};

/**
 * Checks a given `proposedAssignment` against the current database of assignments for conflicts, return the `_id`s of those conflicts.
 * @param {Assignment} proposedAssignment
 */
export const checkForConflicts = (proposedAssignment) => {
  return new Promise((resolve, reject) => {
    console.log('a', proposedAssignment._id);
    Assignment.find({}).then((assignments) => {
      assignments = assignments.filter(((assignment) => {
        const conflictingVehicles = proposedAssignment.assigned_vehicle._id.equals(assignment.assigned_vehicle._id);
        if (proposedAssignment._id) {
          return (!assignment._id.equals(proposedAssignment._id)) && conflictingVehicles;
        } else return conflictingVehicles;
      }));
      console.log(assignments.map((a) => { return a._id; }));
      assignments.sort((a1, a2) => {
        if (a1.assigned_pickupDateAndTime < a2.assigned_pickupDateAndTime) return -1;
        else if (a1.assigned_pickupDateAndTime > a2.assigned_pickupDateAndTime) return 1;
        else return 0;
      });
      const conflicts = [];
      Promise.all(
        assignments.map((assignment) => {
          return new Promise((resolve, reject) => {
            if (!(assignment.assigned_pickupDateAndTime > proposedAssignment.pickupDateAndTime || assignment.assigned_returnDateAndTime < proposedAssignment.returnDateAndTime)) {
              console.log('conflict with ', assignment._id);
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

const processAssignment = (vehicleRequest, assignment, i) => {
  return new Promise(async (resolve, reject) => {
    Vehicle.findOne({ name: assignment.assignedVehicle }).populate('bookings').exec().then((vehicle) => {
      let existingAssignment;

      if (assignment.existingAssignment) {
        // setting pickup times
        existingAssignment.assigned_pickupDate = assignment.pickupDate;
        existingAssignment.assigned_pickupTime = assignment.pickupTime;
        const pickupDateAndTime = createDateObject(assignment.pickupDate, assignment.pickupTime);
        existingAssignment.assigned_pickupDateAndTime = pickupDateAndTime;
        // setting return times
        existingAssignment.assigned_returnDate = assignment.returnDate;
        existingAssignment.assigned_returnTime = assignment.returnTime;
        const returnDateAndTime = createDateObject(assignment.returnDate, assignment.returnTime);
        existingAssignment.assigned_returnDateAndTime = returnDateAndTime;

        existingAssignment.assigned_key = assignment.assignedKey;
        existingAssignment.pickedUp = assignment.pickedUp;
        existingAssignment.returned = assignment.returned;
        if (existingAssignment.assigned_vehicle.name !== assignment.assignedVehicle) {
          vehicle.bookings.push(existingAssignment);
          vehicle.save().then(() => {
            Vehicle.updateOne({ _id: existingAssignment.assigned_vehicle._id }, { $pull: { bookings: existingAssignment._id } }); // remove assignment from previously assigned vehicle
          });
        }
        existingAssignment.assigned_vehicle = vehicle;
        existingAssignment.save().then((updatedAssignment) => {
          resolve(updatedAssignment);
        });
      } else {
        const newAssignment = new Assignment();
        // setting basic info
        newAssignment.request = vehicleRequest;
        newAssignment.assigned_vehicle = vehicle;
        newAssignment.requester = vehicleRequest.requester;
        newAssignment.assigned_key = assignment.assignedKey;
        newAssignment.responseIndex = assignment.responseIndex;
        // setting pickup times
        newAssignment.assigned_pickupDate = assignment.pickupDate;
        newAssignment.assigned_pickupTime = assignment.pickupTime;
        const pickupDateAndTime = createDateObject(assignment.pickupDate, assignment.pickupTime);
        newAssignment.assigned_pickupDateAndTime = pickupDateAndTime;
        // setting return times
        newAssignment.assigned_returnDate = assignment.returnDate;
        newAssignment.assigned_returnTime = assignment.returnTime;
        const returnDateAndTime = createDateObject(assignment.returnDate, assignment.returnTime);
        newAssignment.assigned_returnDateAndTime = returnDateAndTime;

        newAssignment.save().then((savedAssignment) => {
          console.log(savedAssignment);
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
                console.log(conflicts);
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

export const makeVehicleRequest = (req, res) => {
  const vehicleRequest = new VehicleRequest();
  vehicleRequest.requester = req.body.requester;
  vehicleRequest.requestDetails = req.body.requestDetails;
  vehicleRequest.mileage = req.body.mileage;
  vehicleRequest.noOfPeople = req.body.noOfPeople;
  vehicleRequest.requestType = req.body.requestType;
  vehicleRequest.requestedVehicles = req.body.requestedVehicles;
  vehicleRequest.save()
    .then((savedRequest) => {
      res.json(savedRequest);
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
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
  VehicleRequest.find({}).populate('requester').populate('associatedTrip')
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

export const respondToVehicleRequest = async (req, res) => {
  return new Promise((resolve, reject) => {
    try {
      VehicleRequest.findById(req.params.id).exec().then((vehicleRequest) => {
        const proposedAssignments = req.body.assignments;
        processAllAssignments(proposedAssignments, vehicleRequest).then(async (processedAssignments) => {
          const invalidAssignments = processedAssignments.filter((assignment) => {
            return assignment.error;
          });
          vehicleRequest.assignments = processedAssignments;
          vehicleRequest.status = 'approved';
          if (vehicleRequest.requestType === 'TRIP') {
            Trip.findById(vehicleRequest.associatedTrip).exec().then(async (associatedTrip) => {
              associatedTrip.vehicleStatus = 'approved';
              await associatedTrip.save(); // needs await because of multi-path async
            });
          }
          vehicleRequest.save().then((savedVehicleRequest) => {
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
  });
};

export const cancelAssignments = async (req, res) => {
  try {
    const { toBeDeleted } = req.body.deleteInfo;
    await Promise.all(toBeDeleted.map(async (id) => {
      const assignment = await Assignment.findById(id);
      await Vehicle.updateOne({ _id: assignment.assigned_vehicle }, { $pull: { bookings: assignment._id } }); // remove from vehicle bookings
      await VehicleRequest.updateOne({ _id: assignment.request }, { $pull: { assignments: assignment._id } }); // remove from vehicle request assignments
      const vehicleRequest = await VehicleRequest.findById(assignment.request);
      if (vehicleRequest.assignments.length === 0) {
        vehicleRequest.status = 'denied';
        if (vehicleRequest.requestType === 'TRIP') {
          const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).exec();
          associatedTrip.vehicleStatus = 'denied';
          await associatedTrip.save();
        }
      }
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

export const denyVehicleRequest = async (req, res) => {
  try {
    const vehicleRequest = await VehicleRequest.findById(req.params.id).exec();
    vehicleRequest.status = 'denied';
    if (vehicleRequest.requestType === 'TRIP') {
      const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).exec();
      associatedTrip.vehicleStatus = 'denied';
      await associatedTrip.save();
    }
    await vehicleRequest.save();
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
    const assignments = await Assignment.find().populate('request').populate('requester').populate('assigned_vehicle')
      .exec();
    return res.json(assignments);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  }
};
