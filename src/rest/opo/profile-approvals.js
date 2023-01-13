import * as sqlite from '../../services/sqlite.js'

function convertRequestsToTable (trips, route) {
  const rows = trips
    .map(request => {
      const { requester_name, requested_item, req_id } = request
      return `
<tr>
<td>${requester_name}
<td>${requested_item}
<td>
  <button
    class="action deny"
    hx-confirm="Deny ${requester_name} as a leader for ${requested_item}?"
    hx-delete="/rest/opo/profile-approvals/${route}/${req_id}"
    hx-target="closest tr"
    hx-swap="outerHTML swap:.7s"
    >Deny
  </button>
  <button
    class="action approve"
    hx-confirm="Approve ${requester_name} as a leader for ${requested_item}?"
    hx-put="/rest/opo/profile-approvals/${route}/${req_id}"
    hx-target="closest tr"
    hx-swap="outerHTML swap:.7s"
    >Approve
  </button>
</tr>
`
    })

  // Show a little notice if the table is empty
  if (rows.length === 0) {
    const selector = route === 'leaders' ? '.leaders table' : '.certs table'
    return `<div hx-swap-oob="outerHTML:${selector}"><div class=notice>All set for now</div></div>`
  }

  return rows.join('')
}

export function getLeadershipRequests (_req, res) {
  const requests = sqlite.all(`
   SELECT club_leaders.rowid as req_id, users.name AS requester_name, clubs.name AS requested_item
   FROM club_leaders
   LEFT JOIN clubs ON clubs.id = club_leaders.club
   LEFT JOIN users ON users.id = club_leaders.user
   WHERE is_approved = 0`)
  const rows = convertRequestsToTable(requests, 'leaders')
  res.send(rows).status(200)
}

export function approveLeadershipRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.run('UPDATE club_leaders SET is_approved = 1 WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyLeadershipRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.run('DELETE FROM club_leaders WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function getCertRequests (_req, res) {
  const requests = sqlite.all(`
   SELECT user_certs.rowid as req_id, users.name AS requester_name, cert AS requested_item
   FROM user_certs
   LEFT JOIN users ON users.id = user_certs.user
   WHERE is_approved = 0`)
  const rows = convertRequestsToTable(requests, 'certs')
  res.send(rows).status(200)
}

export function approveCertRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.run('UPDATE user_certs SET is_approved = 1 WHERE rowid = ?', rowid)
  return res.status(200).send('')
}

export function denyCertRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.run('DELETE FROM user_certs WHERE rowid = ?', rowid)
  return res.status(200).send('')
}
