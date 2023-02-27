import * as sqlite from '../../services/sqlite.js'

export function get (_req, res) {
  const vehicles = sqlite.all('SELECT id, name, type FROM vehicles where active = 1')
  return res.render('views/opo/manage-fleet.njk', { vehicles })
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
