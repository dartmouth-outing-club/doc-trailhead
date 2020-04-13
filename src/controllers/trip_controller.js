import Trip from '../models/trip_model';
import User from '../models/user_model';
import Club from '../models/club_model';
import VehicleRequest from '../models/vehicle_request_model';

export const createTrip = (req, res) => {
  const trip = new Trip();
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
  if (req.body.vehicles.length > 0) {
    const vehicleRequest = new VehicleRequest();
    vehicleRequest.requester = req.user._id;
    vehicleRequest.mileage = req.body.mileage;
    vehicleRequest.requestDetails = req.body.description;
    vehicleRequest.associatedTrip = null;
    vehicleRequest.requestType = 'TRIP';
    vehicleRequest.requestedVehicles = req.body.vehicles;
    vehicleRequest.save().then((savedVehicleRequest) => {
      trip.vehicleStatus = 'pending';
      trip.vehicleRequest = savedVehicleRequest;
    }).catch((error) => { return console.log(error); });
  }
  trip.members = [];
  trip.leaders = [];
  trip.pending = [];
  trip.leaders.push(req.user.id);
  trip.members.push({ user: req.user.id, gear: {} });
  User.find({ email: { $in: req.body.leaders } })
    .then((users) => {
      Promise.all(users.map((user) => {
        return new Promise((resolve, reject) => {
          if (user.id !== req.user.id) {
            trip.leaders.push(user.id);
            trip.members.push({ user: user.id, gear: {} });
          }
          resolve();
        });
      })).then(() => {
        trip.save().then((savedTrip) => {
          console.log(savedTrip._id);
          VehicleRequest.findByIdAndUpdate({ _id: savedTrip.vehicleRequest.id }, { associatedTrip: savedTrip._id }).then((updatedVehicleRequest) => {
            res.json(updatedVehicleRequest);
          }).catch(() => {
            res.send('Trip created without vehicle requests');
          });
        });
      });
    })
    .catch((error) => {
      console.log(error);
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
    .exec()
    .then((trip) => {
      const isPending = trip.pending.some((pender) => {
        return pender.user.equals(req.user.id);
      });

      const isOnTrip = trip.members.some((member) => {
        return member._id.equals(req.user.id);
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

export const addToPending = (req, res) => {
  const { id } = req.params;
  const { trippeeGear } = req.body;
  Trip.findById(id).exec()
    .then((trip) => {
      trip.pending.push({ user: req.user._id, gear: trippeeGear });
      trip.save()
        .then(() => {
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

export const joinTrip = (req, res) => {
  const { id } = req.params;
  const { pend } = req.body;
  Trip.findById(id).exec()
    .then((trip) => {
      // add user to member list
      trip.members.push(pend);
      pend.gear.forEach((pendGear) => {
        trip.trippeeGear.forEach((gear) => {
          if (pendGear.gearId === gear.id) {
            gear.quantity += 1;
          }
        });
      });
      // remove user from pending list
      trip.pending.forEach((pender, index) => {
        if (pender.id === pend._id) {
          trip.pending.splice(index, 1);
        }
      });
      console.log(trip.members);
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

export const moveToPending = (req, res) => {
  Trip.findById(req.params.id).populate('leaders').populate({
    path: 'members.user',
    model: 'User',
  }).populate({
    path: 'pending.user',
    model: 'User',
  })
    .exec()
    .then((trip) => {
      trip.members.some((member, index) => {
        if (member.user._id.equals(req.body.member.user._id)) {
          member.gear.forEach((memberGear) => {
            trip.trippeeGear.forEach((gear) => {
              if (memberGear.gearId === gear.id) {
                gear.quantity -= 1;
              }
            });
          });
          trip.members.splice(index, 1);
        }
        return member.user.id === req.body.member.user.id;
      });
      trip.pending.push(req.body.member);
      console.log(trip.pending);
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

export const leaveTrip = (req, res) => {
  Trip.findById(req.params.id).populate('leaders').populate({
    path: 'members.user',
    model: 'User',
  }).exec()
    .then((trip) => {
      if (req.body.userTripStatus === 'APPROVED') {
        trip.members.some((member, index) => {
          if (member.user._id.equals(req.user._id)) {
            member.gear.forEach((memberGear) => {
              trip.trippeeGear.forEach((gear) => {
                if (memberGear.gearId === gear.id) {
                  gear.quantity -= 1;
                }
              });
            });
            trip.members.splice(index, 1);
          }
          return member.user._id.equals(req.user._id);
        });
      } else if (req.body.userTripStatus === 'PENDING') {
        trip.pending.some((pender, index) => {
          if (pender.user._id.equals(req.user._id)) {
            trip.pending.splice(index, 1);
          }
          return pender.user._id.equals(req.user._id);
        });
      }
      trip.save()
        .then(() => {
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
    if (trip.leaders.indexOf(req.user._id) !== -1) {
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

export const respondToGearRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.gearStatus = req.body.status;
      trip.save()
        .then(() => {
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

export const respondToTrippeeGearRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.trippeeGearStatus = req.body.status;
      trip.save()
        .then(() => {
          getTrip(req, res);
        });
    }).catch((error) => {
      res.status(500).send(error);
    });
};
export const respondToPCardRequest = (req, res) => {
  Trip.findById(req.body.id)
    .then((trip) => {
      trip.pcardStatus = req.body.pcardStatus;
      trip.pcardAssigned = req.body.pcardAssigned;
      req.params.id = req.body.id;
      trip.save()
        .then(() => {
          getTrip(req, res);
        });
    }).catch((error) => {
      res.status(500).send(error);
    });
};
