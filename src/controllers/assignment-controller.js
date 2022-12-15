import * as db from '../services/sqlite.js'

export async function handleGetAssignmentsForCalendar (_req, res) {
  const assignments = db.getCalenderAssignments()
  res.json(assignments)
}
