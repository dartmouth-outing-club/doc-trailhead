import * as sqlite from '../../services/sqlite.js'

export function get (_req, res) {
  const vehicles = sqlite.all('SELECT id, name, type FROM vehicles where active = 1')
  const rows = vehicles.map(vehicle => `
<tr>
  <td>${vehicle.name}
  <td>${vehicle.type}
  <td><button
      class="deny"
      hx-confirm="Delete ${vehicle.name} from list?"
      hx-delete="/rest/opo/manage-fleet/${vehicle.id}"
      hx-target="closest tr"
      hx-swap="outerHTML swap:.7s"
    >Delete</button>
`).join('\n')
  return res.send(rows).status(200)
}

export function post (req, res) {
  const { name, type } = req.body
  sqlite.run('INSERT INTO vehicles (name, type) VALUES (?, ?)', name, type)
  return get(req, res)
}

export function del (req, res) {
  const id = req.params.id
  sqlite.run('UPDATE vehicles SET active = 0 WHERE id = ?', id)
  return res.send('').status(200)
}
