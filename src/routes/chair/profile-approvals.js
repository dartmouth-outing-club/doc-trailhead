import dateFormat from 'dateformat'

export function get(req, res) {
  const userId = parseInt(req.user)
  const userChairIn = req.db.all(`
    SELECT 
        clubs.id,
        clubs.name
    FROM club_chairs
    LEFT JOIN clubs ON clubs.id = club_chairs.club
    WHERE user = ? AND is_approved = 1
    ORDER BY name
  `, userId)
  const clubIds = userChairIn.map(({ id }) => id)

  const leadership_requests = req.db.all(`
   SELECT 
    club_leaders.rowid as req_id, 
    users.name AS requester_name, 
    clubs.name AS requested_item, 
    clubs.id as clubid,
    certs_med.type as medcert_type,
    certs_med.expiration as medcert_expiration
   FROM club_leaders
   LEFT JOIN clubs ON clubs.id = club_leaders.club
   LEFT JOIN users ON users.id = club_leaders.user
   LEFT JOIN certs_med ON certs_med.user = club_leaders.user
   WHERE opo_approved = 0 AND chair_approved = 0 AND clubid in (${clubIds.join(',')})
   `).map(row => {
    const date = new Date(row.medcert_expiration)
    row.medcert_expiration = !isNaN(date.getTime()) ? dateFormat(date, 'mm-dd-yyyy') : null
    return row
  })

  return res.render('views/chair/profile-approvals.njk', { leadership_requests })
}

export function approveLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('UPDATE club_leaders SET chair_approved = 1 WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyLeadershipRequest(req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  req.db.run('DELETE FROM club_leaders WHERE rowid = ?', rowid)
  return res.status(200).send('')
}
