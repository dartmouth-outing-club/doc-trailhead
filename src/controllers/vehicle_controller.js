import Vehicle from '../models/vehicle_model';

export const createVehicle = (req, res) => {
  const vehicle = new Vehicle();
  vehicle.name = req.body.name;
  vehicle.type = req.body.type;
  vehicle.save()
    .then((savedVehicle) => {
      res.json(savedVehicle);
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};

export const getVehicle = (req, res) => {
  Vehicle.findById(req.params.id).populate('bookings').populate({
    path: 'bookings',
    populate: {
      path: 'request',
      model: 'VehicleRequest',
    },
  }).populate({
    path: 'bookings',
    populate: {
      path: 'requester',
      model: 'User',
    },
  })
    .populate({
      path: 'bookings',
      populate: {
        path: 'request',
        populate: {
          path: 'associatedTrip',
          model: 'Trip',
        },
      },
    })
    .exec()
    .then((vehicle) => {
      res.json(vehicle);
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};

export const getVehicles = (req, res) => {
  Vehicle.find().populate('bookings').populate({
    path: 'bookings',
    populate: {
      path: 'request',
      model: 'VehicleRequest',
    },
  }).populate({
    path: 'bookings',
    populate: {
      path: 'requester',
      model: 'User',
    },
  })
    .populate({
      path: 'bookings',
      populate: {
        path: 'request',
        populate: {
          path: 'associatedTrip',
          model: 'Trip',
        },
      },
    })
    .exec()
    .then((vehicles) => {
      res.json(vehicles);
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};

export const updateVehicle = (req, res) => {
  Vehicle.findById(req.params.id).populate('bookings')
    .then((vehicle) => {
      vehicle.name = req.body.name;
      vehicle.type = req.body.type;
      vehicle.save()
        .then(() => {
          res.json(vehicle);
        });
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};

export const deleteVehicle = (req, res) => {
  Vehicle.findById(req.params.id).populate('bookings')
    .then((vehicle) => {
      Vehicle.deleteOne({ _id: req.params.id }, (error) => {
        if (error) {
          res.json(error);
          console.log(error);
        } else {
          res.json('Vehicle deleted');
        }
      });
    })
    .catch((error) => {
      res.status(500).send(error);
      console.log(error);
    });
};
