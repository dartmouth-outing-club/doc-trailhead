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

const isConflicting = (selectedVehicleBookings, assignment) => {
  const bookingsWithDateAndTime = selectedVehicleBookings.map((booking) => {
    const updates = {};
    updates.pickupDateAndTime = createDateObject(booking.assigned_pickupDate, booking.assigned_pickupTime);
    updates.returnDateAndTime = createDateObject(booking.assigned_returnDate, booking.assigned_returnTime);
    return Object.assign({}, booking, updates);
  });

  const assignmentUpdates = {};
  assignmentUpdates.pickupDateAndTime = createDateObject(assignment.pickupDate, assignment.pickupTime);
  assignmentUpdates.returnDateAndTime = createDateObject(assignment.returnDate, assignment.returnTime);
  const assignmentWithDateAndTime = Object.assign({}, assignment, assignmentUpdates);

  bookingsWithDateAndTime.push(assignmentWithDateAndTime);

  bookingsWithDateAndTime.sort((booking1, booking2) => {
    if (booking1.pickupDateAndTime < booking2.pickupDateAndTime) {
      return -1;
    }
    if (booking1.pickupDateAndTime > booking2.pickupDateAndTime) {
      return 1;
    }
    return 0;
  });
  const conflictsWithEvent = bookingsWithDateAndTime.some((booking, index, array) => {
    let conflict = false;
    if (index < array.length - 1) {
      conflict = booking.returnDateAndTime >= array[index + 1].pickupDateAndTime;
    }
    return conflict;
  });
  return conflictsWithEvent;
};

const processAssignment = async (vehicleRequest, assignment) => {
  try {
    if (assignment.assignedVehicle !== 'Enterprise') {
      const pickupDate = new Date(assignment.pickupDate);
      const pickupTime = assignment.pickupTime.split(':');
      pickupDate.setHours(pickupTime[0], pickupTime[1]);
      const returnDate = new Date(assignment.returnDate);
      const returnTime = assignment.returnTime.split(':');
      returnDate.setHours(returnTime[0], returnTime[1]);
      if (returnDate < pickupDate) {
        return {
          error: 'Pickup date must be earlier than return date',
          assignment,
        };
      }
    }
    const vehicleInArray = await Vehicle.find({ name: assignment.assignedVehicle }).populate('bookings').exec();
    const vehicle = vehicleInArray[0];
    let selectedVehicleBookings;
    let existingAssignment;

    if (assignment.existingAssignment) {
      existingAssignment = await Assignment.findById(assignment.id).populate('assigned_vehicle').exec();
      if (existingAssignment.assigned_vehicle.name === assignment.assignedVehicle) { // vehicle was not changed
        selectedVehicleBookings = vehicle.bookings.filter((booking) => { // remove modified assignment to avoid conflicting with self when checking for validity
          return booking.id !== assignment.id;
        });
      } else { // vehicle was changed
        selectedVehicleBookings = vehicle.bookings; // no need to remove because assignment does not exist in new assigned vehicle
      }
    } else { // is new response
      selectedVehicleBookings = vehicle.bookings;
    }

    console.log(assignment);

    const conflictsWithEvent = assignment.assignedVehicle === 'Enterprise' ? false : isConflicting(selectedVehicleBookings, assignment);

    console.log('the first isConflicting passed');

    const conflictingEvents = vehicle.bookings.filter((booking) => {
      return isConflicting(selectedVehicleBookings, assignment);
    });

    console.log('the second isConflicting passed');

    if (conflictsWithEvent) {
      console.log('conflict');
      return {
        error: 'Proposed assignment conflicts with already existing one',
        conflictingEvents,
        assignment,
      };
    } else if (assignment.existingAssignment) {
      if (assignment.assignedVehicle !== 'Enterprise') {
        existingAssignment.assigned_pickupDate = assignment.pickupDate;
        existingAssignment.assigned_pickupTime = assignment.pickupTime;
        const pickupDateAndTime = createDateObject(assignment.pickupDate, assignment.pickupTime);
        existingAssignment.assigned_pickupDateAndTime = pickupDateAndTime;

        existingAssignment.assigned_returnDate = assignment.returnDate;
        existingAssignment.assigned_returnTime = assignment.returnTime;
        const returnDateAndTime = createDateObject(assignment.returnDate, assignment.returnTime);
        existingAssignment.assigned_returnDateAndTime = returnDateAndTime;

        existingAssignment.assigned_key = assignment.assignedKey;
        existingAssignment.pickedUp = assignment.pickedUp;
        existingAssignment.returned = assignment.returned;
      }
      if (existingAssignment.assigned_vehicle.name !== assignment.assignedVehicle) {
        vehicle.bookings.push(existingAssignment);
        await vehicle.save();
        await Vehicle.updateOne({ _id: existingAssignment.assigned_vehicle._id }, { $pull: { bookings: existingAssignment._id } }); // remove assignment from previously assigned vehicle
      }
      existingAssignment.assigned_vehicle = vehicle;
      const updatedAssignment = await existingAssignment.save();
      return updatedAssignment;
    } else {
      const newAssignment = new Assignment();
      newAssignment.request = vehicleRequest;
      newAssignment.assigned_vehicle = vehicle;
      newAssignment.requester = vehicleRequest.requester;
      newAssignment.responseIndex = assignment.responseIndex;

      if (assignment.assignedVehicle !== 'Enterprise') {
        newAssignment.assigned_pickupDate = assignment.pickupDate;
        newAssignment.assigned_pickupTime = assignment.pickupTime;
        const pickupDateAndTime = createDateObject(assignment.pickupDate, assignment.pickupTime);
        newAssignment.assigned_pickupDateAndTime = pickupDateAndTime;

        newAssignment.assigned_returnDate = assignment.returnDate;
        newAssignment.assigned_returnTime = assignment.returnTime;
        const returnDateAndTime = createDateObject(assignment.returnDate, assignment.returnTime);
        newAssignment.assigned_returnDateAndTime = returnDateAndTime;

        newAssignment.assigned_key = assignment.assignedKey;
      }

      const savedAssignment = await newAssignment.save();
      vehicle.bookings.push(savedAssignment);
      await vehicle.save();
      return savedAssignment;
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(error);
  }
};

const getArrayofProcessedAssignments = async (proposedAssignments, vehicleRequest) => {
  return Promise.all(proposedAssignments.map(async (assignment) => {
    return processAssignment(vehicleRequest, assignment);
  }));
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
  try {
    const vehicleRequest = await VehicleRequest.findById(req.params.id).exec();
    const proposedAssignments = req.body.assignments;
    const processedAssignments = await getArrayofProcessedAssignments(proposedAssignments, vehicleRequest);

    const validAssignments = processedAssignments.filter((assignment) => {
      return !assignment.error;
    });
    const invalidAssignments = processedAssignments.filter((assignment) => {
      return assignment.error;
    });
    vehicleRequest.assignments = validAssignments;
    vehicleRequest.status = 'approved';
    if (vehicleRequest.requestType === 'TRIP') {
      const associatedTrip = await Trip.findById(vehicleRequest.associatedTrip).exec();
      associatedTrip.vehicleStatus = 'approved';
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
    const output = (invalidAssignments.length === 0) ? { updatedVehicleRequest } : { updatedVehicleRequest, invalidAssignments };
    return res.json(output);
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
