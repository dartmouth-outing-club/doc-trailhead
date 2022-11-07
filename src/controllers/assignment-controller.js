import { assignments } from '../services/mongo.js'

export async function deleteAssignments (assignmentsList) {
  return assignments.deleteMany({ _id: { $in: assignmentsList } })
}
