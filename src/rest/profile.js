import * as sqlite from '../services/sqlite.js'

function get (req, res, isEditable) {
  const user = req.user
  const driver_certifications = sqlite.get(`
    SELECT group_concat(cert, ', ') as certs
    FROM user_certs
    WHERE user = ?
  `, user.id)?.certs

  user.driver_certifications = driver_certifications || 'none'
  return res.render(`partials/profile-card${isEditable ? '-editable' : ''}.njs`, user)
}

export function getView (req, res) {
  return get(req, res, false)
}

export function getEditable (req, res) {
  return get(req, res, true)
}

export function post (req, res) {
  console.log(req.body)
  return getView(req, res)
}
