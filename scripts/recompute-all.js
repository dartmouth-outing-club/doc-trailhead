/** Recompute all the conflicts in the Vehicle Assignments.
 *
 * I'll be honest I really have no idea whether or not this works. It's a
 * de-callbacked version of the recompute function that used to run every time
 * a vehicle request was deleted. It turns out that you can make Mongo do all
 * of that work, so once I figured that out I replaced the function entirely. I
 * left this here in case we ever have need to run a script that recomputes
 * all the vehicle conflicts.
 */
import Assignment from '../src/models/assignment-model.js'
import mongoose from 'mongoose'

const mongoURI = process.env.MONGODB_URI // Make sure to explicitly include it

mongoose.set('useCreateIndex', true)

mongoose.connect(mongoURI, { useNewUrlParser: true })
  .then((connection) => {
    return console.log(`MongoDB connection established at ${connection.connections[0].host}:${connection.connections[0].port}`)
  }).catch((error) => {
    console.log(`Error connecting to MongoDB: ${error.message}`)
    mongoose.connect('mongodb://localhost/trailhead', { useNewUrlParser: true }).then((connection) => {
      return console.log(`MongoDB connection established at ${connection.connections[0].host}:${connection.connections[0].port}`)
    })
  })

// set mongoose promises to es6 default
mongoose.Promise = global.Promise

const startTime = new Date()
const assignments = await Assignment.find({ assigned_returnDateAndTime: { $gt: startTime } })

assignments.filter((assignment) => assignment.assignedVehicle !== 'Enterprise')
assignments.sort((a1, a2) => (a1.assigned_pickupDateAndTime < a2.assigned_pickupDateAndTime ? -1 : 1))

const assignmentPromises = assignments.map((assignment, index, array) => {
  assignment.conflicts = []
  let traverser = index + 1
  while (traverser < array.length) {
    if (assignment.assigned_returnDateAndTime > array[traverser].assigned_pickupDateAndTime) {
      if (!assignment.conflicts.includes(array[traverser]._id)) {
        assignment.conflicts.push(array[traverser]._id)
      }
    }
    traverser += 1
  }
  return assignment.save()
})
await Promise.all(assignmentPromises)

const assignmentsForBackChecking = await Assignment.find({ assigned_returnDateAndTime: { $gt: startTime } })
const backCheckingPromises = assignmentsForBackChecking.map(async (pivot) => {
  const pivotConflicts = pivot.conflicts.map(async (compare_id) => {
    const compare = await Assignment.findById(compare_id)
    if (!compare.conflicts.includes(pivot._id)) {
      compare.conflicts.push(pivot._id)
    }
    return compare.save()
  })
  return Promise.all(pivotConflicts)
})

await Promise.all(backCheckingPromises)
const finishTime = new Date()
console.log(`Finished recalculating in ${finishTime - startTime} ms`)
mongoose.disconnect()
