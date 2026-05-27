export function get(req, res) {
  const userId = parseInt(req.user)

  const leadership_requests = req.db.all(`
     SELECT
      clr.rowid as req_id,
      users.name AS requester_name,
      clubs.name AS requested_item,
      clubs.id as clubid,
      certs_med.type as medcert_type,
      date(certs_med.expiration/1000, 'unixepoch') as medcert_expiration
     FROM club_leader_requests as clr
     LEFT JOIN clubs ON clubs.id = clr.club
     LEFT JOIN users ON users.id = clr.user
     LEFT JOIN certs_med ON certs_med.user = clr.user
     LEFT JOIN club_leaders AS cl ON clr.club = cl.club AND cl.user = ? AND cl.is_chair = 1
     WHERE chair_approved = 0 AND cl.user IS NOT NULL
   `, userId)

  return res.render('views/chair/profile-approvals.njk', { leadership_requests })
}

export function approveLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('UPDATE club_leader_requests SET chair_approved = 1 WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_leader_requests WHERE rowid = ?', rowid)
  return res.status(200).send('')
}
