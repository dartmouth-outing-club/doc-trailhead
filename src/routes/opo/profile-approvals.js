export function get(req, res) {
  const leadership_requests = req.db.all(`
     SELECT
      clr.rowid as req_id,
      users.id AS requester_id,
      users.name AS requester_name,
      clubs.name AS requested_item
     FROM club_leader_requests AS clr
     LEFT JOIN clubs ON clubs.id = clr.club
     LEFT JOIN users ON users.id = clr.user
     WHERE chair_approved = TRUE
   `)

  const chair_requests = req.db.all(`
     SELECT
      ccr.rowid as req_id,
      users.id AS requester_id,
      users.name AS requester_name,
      clubs.name AS requested_item
     FROM club_chair_requests AS ccr
     LEFT JOIN clubs ON clubs.id = ccr.club
     LEFT JOIN users ON users.id = ccr.user
   `)

  const club_chairs = req.db.all(`
     SELECT
       club_leaders.rowid as chair_id,
       users.id AS user_id,
       users.name AS user_name,
       clubs.name AS club_name
     FROM club_leaders
       LEFT JOIN clubs ON clubs.id = club_leaders.club
       LEFT JOIN users ON users.id = club_leaders.user
     WHERE is_chair = TRUE
     ORDER BY club_name, club_leaders.rowid
   `)

  const cert_requests = req.db.all(`
   SELECT
    certs_vehicles.rowid as req_id,
    users.id as requester_id,
    users.name AS requester_name,
    cert AS requested_item
   FROM certs_vehicles
   LEFT JOIN users ON users.id = certs_vehicles.user
   WHERE is_approved = FALSE`)

  const data = { leadership_requests, chair_requests, club_chairs, cert_requests }
  return res.render('views/opo/profile-approvals.njk', data)
}

export function approveLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run(`
      INSERT OR REPLACE INTO club_leaders (user, club, is_chair)
      SELECT user, club, FALSE
      FROM club_leader_requests
      WHERE rowid = ?
    `, rowid)

  req.db.run('DELETE FROM club_leader_requests WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

// TODO: Check with OPO if this should delete entirely or send back to club chairs
export function denyLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_leader_requests WHERE clr.rowid = ?', rowid)
  return res.status(200).send('')
}

export function approveChairRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run(`
      INSERT OR REPLACE INTO club_leaders (user, club, is_chair)
      SELECT user, club, TRUE
      FROM club_chair_requests
      WHERE rowid = ?
    `, rowid)

  req.db.run('DELETE FROM club_chair_requests WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyChairRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_chair_requests WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function searchUsers(req, res) {
  const search = req.body.search
  if (!search?.length || search.length < 1) {
    return res.send('<div id=search-results class=notice>Results will display here</div>')
  }
  const searchTerm = `%${search}%`
  const users = req.db.all('SELECT id, name, email FROM users WHERE name like ?', searchTerm)

  if (users.length > 100) {
    return res.send('<div id=search-results class=notice>Too many results, keep typing to narrow them</div>')
  }

  return res.render('views/opo/user-search-results.njk', { users })
}
