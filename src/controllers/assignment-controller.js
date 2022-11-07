import { assignments } from '../services/mongo.js'

export async function deleteAssignments (assignmentsList) {
  await assignments.deleteMany({ _id: { $in: assignmentsList } })
  // For each assignment, delete any conflicts it had
  const promises = assignmentsList.map(assignment => assignments.updateMany({}, { $pull: { conflicts: assignment } }))
  return Promise.all(promises)
}

export async function getAssignmentReturningAfter (time) {
  return assignments.find({ assigned_returnDateAndTime: { $gt: time } })
}

export async function removeAssignmentFromConflicts (assignmentId) {
  return assignments.updateMany({}, { $pull: { conflicts: assignmentId } })
}
