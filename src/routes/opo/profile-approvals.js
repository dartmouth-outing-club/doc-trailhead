export function get (req, res) {
  const leadership_requests = req.db.all(`
   SELECT club_leaders.rowid as req_id, users.name AS requester_name, clubs.name AS requested_item
   FROM club_leaders
   LEFT JOIN clubs ON clubs.id = club_leaders.club
   LEFT JOIN users ON users.id = club_leaders.user
   WHERE is_approved = 0
   `)
  const cert_requests = req.db.all(`
   SELECT user_certs.rowid as req_id, users.name AS requester_name, cert AS requested_item
   FROM user_certs
   LEFT JOIN users ON users.id = user_certs.user
   WHERE is_approved = 0`)

  return res.render('views/opo/profile-approvals.njk', { leadership_requests, cert_requests })
}

// TODO: Add is_approved = 0 to all these WHERE statements
// That way it's only possible to change something that the interface is displaying
export function approveLeadershipRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('UPDATE club_leaders SET is_approved = 1 WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyLeadershipRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_leaders WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function approveCertRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('UPDATE user_certs SET is_approved = 1 WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyCertRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM user_certs WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function searchUsers (req, res) {
  const search = req.body.search
  const searchTerm = `%${search}%`
  const users = req.db.all('SELECT id, name, email FROM users WHERE name like ?', searchTerm)
  return res.render('views/opo/user-search-results.njk', { users })
}
