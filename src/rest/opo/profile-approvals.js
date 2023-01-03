import * as sqlite from '../../services/sqlite.js'
import { escapeProperties } from '../../templates.js'

function convertRequestsToTable (trips, route) {
  const rows = trips
    .map(escapeProperties)
    .map(request => {
      const { requester_name, requested_item, req_id } = request
      return `
<tr>
<td>${requester_name}
<td>${requested_item}
<td>
  <button
    hx-confirm="Deny ${requester_name} as a leader for ${requested_item}?"
    hx-delete="/rest/opo/profile-approvals/${route}/${req_id}"
    hx-target="closest tr"
    hx-swap="outerHTML swap:1s"
    >Deny
  </button>
  <button
    hx-confirm="Approve ${requester_name} as a leader for ${requested_item}?"
    hx-put="/rest/opo/profile-approvals/${route}/${req_id}"
    hx-target="closest tr"
    hx-swap="outerHTML swap:1s"
    >Approve
  </button>
</tr>
`
    }).join('')

  return rows
}

export function getLeadershipRequests (_req, res) {
  const requests = sqlite.getDb().prepare(`
   SELECT club_leaders.rowid as req_id, users.name AS requester_name, clubs.name AS requested_item
   FROM club_leaders
   LEFT JOIN clubs ON clubs.id = club_leaders.club
   LEFT JOIN users ON users.id = club_leaders.user
   WHERE is_approved = 0`).all()
  const rows = convertRequestsToTable(requests, 'leaders')
  res.send(rows).status(200)
}

export function approveLeadershipRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.getDb().prepare('UPDATE club_leaders SET is_approved = 1 WHERE rowid = ?').run(rowid)
  return res.status(200).send('')
}

export function denyLeadershipRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.getDb().prepare('DELETE FROM club_leaders WHERE rowid = ?').run(rowid)
  return res.status(200).send('')
}

export function getCertRequests (_req, res) {
  const requests = sqlite.getDb().prepare(`
   SELECT user_certs.rowid as req_id, users.name AS requester_name, cert AS requested_item
   FROM user_certs
   LEFT JOIN users ON users.id = user_certs.user
   WHERE is_approved = 0`).all()
  const rows = convertRequestsToTable(requests, 'certs')
  res.send(rows).status(200)
}

export function approveCertRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.getDb().prepare('UPDATE user_certs SET is_approved = 1 WHERE rowid = ?').run(rowid)
  return res.status(200).send('')
}

export function denyCertRequest (req, res) {
  const rowid = req.params.req_id
  if (!rowid) return res.sendStatus(400)
  sqlite.getDb().prepare('DELETE FROM user_certs SET WHERE rowid = ?').run(rowid)
  return res.status(200).send('')
}
