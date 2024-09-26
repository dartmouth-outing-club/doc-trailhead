export function getIndividualRequestedGear(db, tripId) {
// I couldn't immediately think of a sophisticated way to combine these three queries
  // I think is one area where a better database structure would help, but might be unnecessary
  // Anyway it's not that fancy, just one GROUP BY for shoes and one for clothes
  // Everything else is not sized
  const requestedShoes = db.all(`
    SELECT trg.name || ' (' || shoe_size || ')' AS name, count(users.name) AS quantity
    FROM member_gear_requests AS mgr
    LEFT JOIN trip_required_gear AS trg ON trg.id = mgr.gear
    LEFT JOIN users on mgr.user = users.id
    LEFT JOIN trip_members AS tm ON tm.user = mgr.user AND tm.trip = ?
    WHERE mgr.trip = ? AND size_type = 'Shoe' AND shoe_size IS NOT NULL AND tm.pending = 0
    GROUP BY trg.id, shoe_size;
  `, tripId, tripId)

  const requestedClothes = db.all(`
    SELECT trg.name || ' (' || clothe_size || ')' AS name, count(users.name) AS quantity
    FROM member_gear_requests AS mgr
    LEFT JOIN trip_required_gear AS trg ON trg.id = mgr.gear
    LEFT JOIN users on mgr.user = users.id
    LEFT JOIN trip_members AS tm ON tm.user = mgr.user AND tm.trip = ?
    WHERE mgr.trip = ? AND size_type = 'Clothe' AND clothe_size IS NOT NULL AND tm.pending = 0
    GROUP BY trg.id, clothe_size;
  `, tripId, tripId)

  const requestedElse = db.all(`
    SELECT trg.name, count(users.name) AS quantity
    FROM member_gear_requests AS mgr
    LEFT JOIN trip_required_gear AS trg ON trg.id = mgr.gear
    LEFT JOIN users on mgr.user = users.id
    LEFT JOIN trip_members AS tm ON tm.user = mgr.user AND tm.trip = ?
    WHERE mgr.trip = ? AND (size_type != 'Shoe' AND size_type != 'Clothe') AND tm.pending = 0
    GROUP BY trg.id
  `, tripId, tripId)

  // Combine the three arrays and sort them by name
  const individualRequestedGear = [...requestedShoes, ...requestedClothes, ...requestedElse]
  individualRequestedGear.sort((a, b) => a.name.localeCompare(b.name))

  return individualRequestedGear
}

export function getGroupRequestedGear(db, tripId) {
  return db.all(`
    SELECT name, quantity FROM group_gear_requests WHERE trip = ? ORDER BY quantity DESC
  `, tripId)
}
