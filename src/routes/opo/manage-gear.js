export function get(req, res) {
  const all_gear = req.db.all('SELECT id, name, class, description, type, quantity, rental_fee, replacement_fee FROM gear where active = 1')
  return res.render('views/opo/manage-gear.njk', { all_gear })
}

export function post(req, res) {
    //TODO: had to rename class to gearclass here cause of JS conflict. should probbbbably rename elsewhere...
  // NOTE: formating
  const { name, gearclass, description, type, quantity, rental_fee, replacement_fee } = req.body
  //NOTE: prolly only conflict on name AND class?
  req.db.run(

  `INSERT INTO gear (name, class, description, type, quantity, rental_fee, replacement_fee, active) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 1) 
    ON CONFLICT(name) 
    DO UPDATE SET 
    description = excluded.description,
    quantity = excluded.quantity,
    rental_fee = excluded.rental_fee,
    replacement_fee = excluded.replacement_fee,
    active = 1;`,
    [name, gearclass, description, type, quantity, rental_fee, replacement_fee]
  )
  return get(req, res)
}

export function del(req, res) {
  const id = req.params.id
  req.db.run('UPDATE gear SET active = false WHERE id = ?', id)
  return res.send('').status(200)
}
