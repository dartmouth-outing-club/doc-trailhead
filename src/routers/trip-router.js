import { Router } from 'express'

import { requireAuth } from '../services/passport.js'
import { logError } from '../services/error.js'
import * as trips from '../controllers/trip-controller.js'
import * as clubs from '../models/club-model.js'

const tripsRouter = Router()

tripsRouter.route('/')
  .post(requireAuth, (req, res) => {
    trips.createTrip(req.user, req.body).then((result) => {
      res.json(result)
    }).catch((error) => { console.log(error); logError({ type: 'createTrip', message: error.message }); return res.status(500).json(error) })
  })
  .get(requireAuth, async (req, res) => {
    const filters = {}
    if (req.query.club) {
      const club = await clubs.findOne({ name: req.query.club })
      if (club) filters.club = club.id
      else res.status(404).json(new Error('No club found with that name'))
    }
    if (req.query.getPastTrips === 'false') {
      filters.startDateAndTime = { $gte: new Date() }
    } else {
      filters.startDateAndTime = {
        $gte: new Date(
          process.env.ARCHIVE_START_YEAR || '2020',
          process.env.ARCHIVE_START_MONTH || '0'
        )
      }
    }
    trips.getTrips(filters).then((result) => {
      res.json(result)
    }).catch((error) => { return res.status(500).json(error) })
  })

tripsRouter.route('/public')
  .get(trips.getPublicTrips)

tripsRouter.route('/:tripID')
  .get(requireAuth, async (req, res) => {
    trips.getTrip(req.params.tripID, req.user)
      .then((result) => { res.json(result) })
      .catch((error) => { return res.status(500).json(error) })
  })
  .put(requireAuth, trips.updateTrip)
  .delete(requireAuth, trips.deleteTrip)

/**
 * Trip membership functions
 */

tripsRouter.post('/apply/:tripID', requireAuth, (req, res) => {
  trips.apply(req.params.tripID, req.user._id, req.body.trippeeGear)
    .then(() => {
      trips.getTrip(req.params.tripID, req.user).then((result) => { return res.json(result) })
    })
    .catch((error) => { console.log(error); logError({ type: 'applyToTrip', message: error.message }); res.status(500).send(error.message) })
})

tripsRouter.post('/reject/:tripID', requireAuth, (req, res) => {
  trips.reject(req.params.tripID, req.body.rejectedUserID).then(() => { return res.json() }).catch((error) => { res.status(500).json(error) })
})

tripsRouter.post('/admit/:tripID', requireAuth, (req, res) => {
  trips.admit(req.params.tripID, req.body.admittedUserID).then(() => { res.json() }).catch((error) => { res.status(500).json(error) })
})

tripsRouter.post('/unadmit/:tripID', requireAuth, (req, res) => {
  trips.unAdmit(req.params.tripID, req.body.unAdmittedUserID).then(() => { return res.json() }).catch((error) => { res.status(500).json(error) })
})

tripsRouter.post('/leave/:tripID', requireAuth, (req, res) => {
  trips.leave(req.params.tripID, req.body.leavingUserID).then(() => { res.json() }).catch((error) => { return res.status(500).json(error) })
})

tripsRouter.put('/set-attendence/:tripID', requireAuth, trips.setMemberAttendance)
tripsRouter.put('/toggle-left/:tripID', requireAuth, trips.toggleTripLeftStatus)
tripsRouter.put('/toggle-returned/:tripID', requireAuth, trips.toggleTripReturnedStatus)
tripsRouter.put('/toggle-leadership/:tripID', requireAuth, trips.toggleTripLeadership)

tripsRouter.put('/editusergear/:tripID', requireAuth, trips.editUserGear)

export default tripsRouter
