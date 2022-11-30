import { Router } from 'express'

import { requireAuth } from '../services/passport.js'
import { logError } from '../services/error.js'
import * as trips from '../controllers/trip-controller.js'

const tripsRouter = Router()

tripsRouter.route('/')
  .post(requireAuth, async (req, res) => {
    try {
      const result = await trips.createTrip(req.user, req.body)
      res.json(result)
    } catch (error) {
      console.log(error)
      logError({ type: 'createTrip', message: error.message })
      res.status(500).send('Something went wrong creating the trip.')
    }
  })
  .get(requireAuth, async (req, res) => {
    const getPastTrips = req.query.getPastTrips !== 'false'
    const allTrips = await trips.getTrips(getPastTrips)
    return res.json(allTrips)
  })

tripsRouter.route('/public')
  .get(trips.getPublicTrips)

tripsRouter.route('/:tripID')
  .get(requireAuth, async (req, res) => {
    trips.getTrip(req.params.tripID, req.user)
      .then((result) => { res.json(result) })
      .catch((error) => { console.log(error); return res.sendStatus(500) })
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
    .catch((error) => { console.log(error); logError({ type: 'applyToTrip', message: error.message }); res.sendStatus(500) })
})

tripsRouter.post('/reject/:tripID', requireAuth, (req, res) => {
  trips.reject(req.params.tripID, req.body.rejectedUserID).then(() => { return res.json() }).catch((error) => { console.log(error); res.sendStatus(500) })
})

tripsRouter.post('/admit/:tripID', requireAuth, (req, res) => {
  trips.admit(req.params.tripID, req.body.admittedUserID).then(() => { res.json() }).catch((error) => { console.log(error); res.sendStatus(500) })
})

tripsRouter.post('/unadmit/:tripID', requireAuth, (req, res) => {
  trips.unAdmit(req.params.tripID, req.body.unAdmittedUserID).then(() => { return res.json() }).catch((error) => { console.log(error); res.sendStatus(500) })
})

tripsRouter.post('/leave/:tripID', requireAuth, async (req, res) => {
  await trips.leave(req.params.tripID, req.body.leavingUserID)
  res.status(200).send()
})

tripsRouter.put('/set-attendence/:tripID', requireAuth, trips.setMemberAttendance)
tripsRouter.put('/toggle-left/:tripID', requireAuth, trips.toggleTripLeftStatus)
tripsRouter.put('/toggle-returned/:tripID', requireAuth, trips.toggleTripReturnedStatus)
tripsRouter.put('/toggle-leadership/:tripID', requireAuth, trips.toggleTripLeadership)

tripsRouter.put('/editusergear/:tripID', requireAuth, trips.editUserGear)

export default tripsRouter
