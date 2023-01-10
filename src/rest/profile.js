import * as sqlite from '../services/sqlite.js'

function getLeaderFor (userId) {
  return sqlite.get(`
    SELECT group_concat(name, ', ') as clubs
    FROM club_leaders
    LEFT JOIN clubs ON club_leaders.club = clubs.name
    WHERE user = ? AND is_approved = 1
  `, userId)?.clubs
}

function get (req, res, isEditable) {
  const user = sqlite.get('SELECT * FROM users WHERE id = ?', req.user)
  const certs = sqlite
    .all('SELECT cert, is_approved FROM user_certs WHERE user = ?', req.user)
    .map(item => `${item.cert}${item.is_approved === 0 ? ' (pending)' : ''}`)
    .join(', ')

  user.driver_certifications = certs.length > 0 ? certs : 'none'
  user.leader_for = getLeaderFor(user.id) || 'none'
  return res.render(`partials/profile-card${isEditable ? '-editable' : ''}.njs`, user)
}

export function getProfileView (req, res) {
  return get(req, res, false)
}

export function getProfileEditable (req, res) {
  return get(req, res, true)
}

export function post (req, res) {
  const formData = req.body
  formData.user_id = req.user
  sqlite.run(`
    UPDATE users
    SET
      name = @name,
      email = @email,
      pronoun = @pronouns,
      dash_number = @dash_number,
      clothe_size = @clothe_size,
      shoe_size = @shoe_size,
      height = @height,
      allergies_dietary_restrictions = @allergies_dietary_restrictions,
      medical_conditions = @medical_conditions
    WHERE id = @user_id
  `, formData)
  return getProfileView(req, res)
}

const VALID_CERTS = ['VAN', 'MICROBUS', 'TRAILER']
export function getDriverCertRequest (req, res) {
  const userId = req.user
  const driver_certs = sqlite.all('SELECT cert, is_approved FROM user_certs WHERE user = ?', userId)
  const checkboxes = VALID_CERTS.map(cert => {
    const userCert = driver_certs.find(item => item.cert === cert)
    const attributes = userCert ? `checked ${userCert.is_approved ? 'disabled ' : ''}` : ''
    return `<label><input ${attributes}type=checkbox name=cert value=${cert}></input>${cert}</label>`
  })
  const form = `
<form hx-boost=true
      hx-push-url=false
      action=/rest/profile/driver-cert
      method=post class="driver-cert-request">
<div class="checkbox-row">${checkboxes.join('\n')}</div>
<div class="button-row">
  <button class="action deny" hx-get="/rest/profile">Cancel</button>
  <button class="action approve" type=submit>Save</button>
</div>
</form>
  `
  res.send(form).status(200)
}

export function postDriverCertRequest (req, res) {
  if (!req.body.cert) return res.sendStatus(400)

  // Delete all the *pending* requests so that we can add the new pending requests
  sqlite.run('DELETE FROM user_certs WHERE user = ? and is_approved = 0', req.user)

  // body-parser weirdness: if there's a single value it's a string, if there's multiple it's an
  // array of strings
  const certs = typeof req.body.cert === 'string' ? [req.body.cert] : req.body.cert
  certs
    .filter(cert => VALID_CERTS.includes(cert))
    .map(cert => sqlite.run(
      'INSERT OR IGNORE INTO user_certs (user, cert, is_approved) VALUES (?, ?, false)',
      req.user, cert
    )) // INSERT OR IGNORE so that existing, approved certs will not be overwritten

  return getProfileView(req, res)
}

export function getClubLeadershipRequest (req, res) {

}

export function postClubLeadershipRequest (req, res) {

}
