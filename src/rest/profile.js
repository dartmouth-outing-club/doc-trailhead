import * as sqlite from '../services/sqlite.js'

export function get (req, res) {
  const user = req.user
  const driver_certifications = sqlite.get(`
    SELECT group_concat(cert, ', ') as certs
    FROM user_certs
    WHERE user = ?
  `, user.id)?.certs

  user.driver_certifications = driver_certifications || 'none'
  return res.render('partials/profile-card.njs', user)
}
