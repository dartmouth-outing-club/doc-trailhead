import VehicleRequest from '../models/vehicle_request_model';

export const makeVehicleRequest = (req, res) => {
  const vehicleRequest = new VehicleRequest();
  vehicleRequest.requester = req.body.requester;
  vehicleRequest.requestDetails = req.body.requestDetails;
  vehicleRequest.requestType = req.body.requestType;
  vehicleRequest.requestedVehicles = req.body.requestedVehicles;
  vehicleRequest.save()
    .then((savedRequest) => {
      res.json({ savedRequest });
      return;
    })
    .catch((error) => {
      console.log(error);
    });
};

export const getVehicleRequest = (req, res) => {
  VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip')
    .then((vehicleRequest) => {
      res.json(vehicleRequest);
    });
}

export const updateVehicleRequest = (req, res) => {
  VehicleRequest.findById(req.params.id).populate('requester').populate('associatedTrip')
    .then((vehicleRequest) => {
      if (vehicleRequest.status !== 'pending') {
        res.status(400).send('Only pending requests can be updated');
        return;
      } else {
        vehicleRequest.requester = req.body.requester;
        vehicleRequest.requestDetails = req.body.requestDetails;
        vehicleRequest.requestType = req.body.requestType;
        vehicleRequest.requestedVehicles = req.body.requestedVehicles;
        vehicleRequest.save()
          .then((savedRequest) => {
            res.json(savedRequest);
            return;
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
}