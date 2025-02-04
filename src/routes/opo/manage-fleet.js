export function get(req, res) {
  const vehicles = req.db.all('SELECT id, name, type FROM vehicles where active = 1')
  return res.render('views/opo/manage-fleet.njk', { vehicles })
}

export function post(req, res) {
  const { name, type } = req.body
  const vehicles = req.db.all('SELECT id, name, type FROM vehicles')
  const vehicleExists = vehicles.some(vehicle => vehicle.name === name)
  if (vehicleExists) {
    req.db.run('UPDATE vehicles SET active = 1 WHERE name = ?', [name])
  } else {
    req.db.run('INSERT INTO vehicles (name, type) VALUES (?, ?)', name, type)
  }
  return get(req, res)
}

export function del(req, res) {
  const id = req.params.id
  req.db.run('UPDATE vehicles SET active = 0 WHERE id = ?', id)
  return res.send('').status(200)
}
