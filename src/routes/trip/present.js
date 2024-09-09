function renderAttendanceTable (req, res, tripId) {
  const data = getAttendanceData(req, tripId)
  res.render('trip/attendance-table.njk', data)
}

export function getAttendanceData (req, tripId) {
  const trip = req.db.get(`
    SELECT id AS trip_id, title, left AS checked_out, start_time
    FROM trips
    WHERE id = ?
  `, tripId)
  const members = req.db.all(`
    SELECT trips.title, users.id, users.name, attended, trips.left
    FROM trip_members
    LEFT JOIN users ON users.id = trip_members.user
    LEFT JOIN trips ON trips.id = trip_members.trip
    WHERE trip = ? AND pending = 0
    ORDER BY users.name
  `, tripId)

  return { ...trip, members }
}

export function put (req, res) {
  const { tripId, memberId } = req.params
  const info = req.db.run(`
    UPDATE trip_members
    SET attended = TRUE
    WHERE trip = ? AND user = ? AND pending = 0
  `, tripId, memberId)

  if (info.changes !== 1) {
    console.error(`Attempted to mark member ${memberId} present on trip ${tripId}`)
    console.error('Unexpected number of changes based on request: ', info.changes)
  }

  renderAttendanceTable(req, res, tripId)
}

export function del (req, res) {
  const { tripId, memberId } = req.params
  const info = req.db.run(`
    UPDATE trip_members
    SET attended = FALSE
    WHERE trip = ? AND user = ? AND pending = 0
  `, tripId, memberId)

  if (info.changes !== 1) {
    console.error(`Attempted to mark member ${memberId} present on trip ${tripId}`)
    console.error('Unexpected number of changes based on request: ', info.changes)
  }

  renderAttendanceTable(req, res, tripId)
}
