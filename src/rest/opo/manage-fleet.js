import * as sqlite from '../../services/sqlite.js'

export function get (_req, res) {
  // const now = new Date()
  const vehicles = sqlite.all('SELECT id, name, type FROM vehicles where active = 1')
  const rows = vehicles.map(vehicle => `
<tr>
  <td>${vehicle.name}
  <td>${vehicle.type}
  <td><button
      class="deny"
      hx-confirm="Delete ${vehicle.name} from list?"
      hx-delete="/rest/opo/manage-fleet/id"
      hx-target="closest tr"
      hx-swap="outerHTML swap:.7s"
    >Delete</button>
`).join('\n')
  return res.send(rows).status(200)
}
