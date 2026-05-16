import dateFormat from 'dateformat'

export function get(req, res) {
  const leadership_requests = req.db.all(`
   SELECT club_leaders.rowid as req_id, users.name AS requester_name, clubs.name AS requested_item
   FROM club_leaders
   LEFT JOIN clubs ON clubs.id = club_leaders.club
   LEFT JOIN users ON users.id = club_leaders.user
   WHERE opo_approved = FALSE and chair_approved = TRUE
   `)

  const chair_requests = req.db.all(`
   SELECT club_chairs.rowid as req_id, users.name AS requester_name, clubs.name AS requested_item
   FROM club_chairs
   LEFT JOIN clubs ON clubs.id = club_chairs.club
   LEFT JOIN users ON users.id = club_chairs.user
   WHERE is_approved = FALSE
   `)

  const active_chairs = req.db.all(`
   SELECT club_chairs.rowid as chair_id, chair_since, users.name AS user_name, clubs.name AS club_name
   FROM club_chairs
   LEFT JOIN clubs ON clubs.id = club_chairs.club
   LEFT JOIN users ON users.id = club_chairs.user
   WHERE is_approved = TRUE
   ORDER BY club_name, chair_since
   `).map(row => {
    const date = new Date(row.chair_since)
    row.chair_since = dateFormat(date, 'mm-dd-yyyy')
    return row
  })

  const cert_requests = req.db.all(`
   SELECT certs_vehicles.rowid as req_id, users.name AS requester_name, cert AS requested_item
   FROM certs_vehicles
   LEFT JOIN users ON users.id = certs_vehicles.user
   WHERE is_approved = FALSE`)

  return res.render('views/opo/profile-approvals.njk', { leadership_requests, chair_requests, active_chairs, cert_requests })
}

export function approveLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('UPDATE club_leaders SET opo_approved = TRUE WHERE rowid = ? AND chair_approved = TRUE', rowid)
  return res.status(200).send('')
}

// TODO: Check with OPO if this should delete entirely or send back to club chairs
export function denyLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_leaders WHERE rowid = ? AND opo_approved = FALSE', rowid)
  return res.status(200).send('')
}

export function approveDriverCertRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('UPDATE certs_vehicles SET is_approved = TRUE WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyDriverCertRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM certs_vehicles WHERE rowid = ? AND is_approved = FALSE', rowid)
  return res.status(200).send('')
}

export function approveChairRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  const today = Math.floor(new Date().getTime()) // NOTE: this is actually so ugly and surely a better option exists...
  req.db.run('UPDATE club_chairs SET is_approved = TRUE, chair_since = ? WHERE rowid = ?', today, rowid)
  return res.status(200).send('')
}

export function denyChairRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_chairs WHERE rowid = ?', rowid)
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
