import { BadRequestError, NotFoundError } from '../request/errors.js'
import dateFormat from 'dateformat'

export function getProfileView(req, res) {
  if (req.query.card) {
    return getProfileCard(req, res)
  }

  const userId = parseInt(req.params.userId)
  if (!userId || userId === req.user) {
    res.locals.is_self = true
    const data = getProfileData(req, req.user)
    return res.render('views/profile.njk', data)
  }

  if (!res.locals.is_opo) return res.sendStatus(403)

  res.locals.is_self = false
  const data = getProfileData(req, userId)
  return res.render('views/profile.njk', data)
}

export function getNewUserView(req, res) {
  const data = getProfileData(req, req.user)
  return res.render('views/new-user.njk', data)
}

export function getProfileCard(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const data = getProfileData(req, userId)
  return res.render('profile/profile-card.njk', data)
}

export function getProfileCardEditable(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const data = getProfileData(req, userId)
  return res.render('profile/profile-card-editable.njk', data)
}

export function getUserTripView(req, res) {
  const { userId, tripId } = req.params
  const isOnTrip = req.db.get('SELECT 1 FROM trip_members WHERE trip = ? AND user = ?',
    tripId, userId
  )
  if (!isOnTrip) throw new NotFoundError(`User ${userId} not found`)

  const data = getProfileData(req, req.params.userId, true)
  return res.render('views/profile.njk', data)
}

function getProfileData(req, userId, hideControls) {
  const user = req.db.get('SELECT * FROM users WHERE id = ?', userId)
  if (!user) throw new NotFoundError(`User ${userId} not found`)

  const certs_vehicles = req.db
    .all('SELECT cert, is_approved FROM certs_vehicles WHERE user = ?', userId)
    .map(item => `${item.cert}${item.is_approved === 0 ? ' (pending)' : ''}`)
    .join(', ')

  const now = new Date()
  const todayISO = now.toISOString().split('T')[0] // used for min date of medcert expiration
  user.today_iso = todayISO

  const certs_med = req.db.get('SELECT type, expiration FROM certs_med WHERE user = ?', userId)
  if (certs_med) {
    user.medcert_type = certs_med.type
    const medcert_expiration_date = new Date(certs_med.expiration)
    user.medcert_expiration_iso = medcert_expiration_date.toISOString().split('T')[0] // for form input
    user.medcert_expiration = dateFormat(medcert_expiration_date, 'mm-dd-yyyy') // for table view
  } else {
    user.medcert_type = 'none'
  }

  if (user.shoe_size) {
    const split = user.shoe_size.split('-')
    user.shoe_size_sex = split[0]
    user.shoe_size_num = split[1]
  }

  user.feet = Math.floor(user.height_inches / 12)
  user.inches = user.height_inches % 12
  user.height = `${user.feet}'${user.inches}"`

  user.driver_certifications = certs_vehicles.length > 0 ? certs_vehicles : 'none'
  user.leader_for = req.db.get(`
    SELECT group_concat(
      iif(opo_approved = 1, name, name || ' (pending)'),
      ', '
    ) as clubs
    FROM club_leaders
    LEFT JOIN clubs ON club_leaders.club = clubs.id
    WHERE user = ?
  `, userId)?.clubs || 'none'

  user.chair_for = req.db.get(`
    SELECT group_concat(
      iif(is_approved = 1, name, name || ' (pending)'),
      ', '
    ) as clubs
    FROM club_chairs
    LEFT JOIN clubs ON club_chairs.club = clubs.id
    WHERE user = ?
  `, userId)?.clubs || 'none'
  user.hide_controls = hideControls
  delete user.is_opo // TODO stop using a SELECT * so you don't have to do this
  return user
}

const VALID_PHONE = /[0-9]{10,}/

export function put(req, res) {
  const formData = { ...req.body }
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  formData.user_id = userId
  const { shoe_size_sex, shoe_size_num, feet, inches } = formData
  formData.shoe_size = shoe_size_sex && shoe_size_num ? `${shoe_size_sex}-${shoe_size_num}` : null
  formData.height_inches = (parseInt(feet) * 12) + parseInt(inches)

  if (!VALID_PHONE.test(formData.phone)) throw new BadRequestError('Invalid phone number')

  req.db.run(`
    UPDATE users
    SET
      name = @name,
      pronoun = @pronouns,
      dash_number = @dash_number,
      phone = @phone,
      clothe_size = @clothe_size,
      shoe_size = @shoe_size,
      height_inches = @height_inches,
      allergies_dietary_restrictions = @allergies_dietary_restrictions,
      medical_conditions = @medical_conditions
    WHERE id = @user_id
  `, formData)

  const medcertType = formData.medcert_type
  // slight nonsense to avoid worrying about timezones
  const medcertExpiration = new Date(formData.medcert_expiration + 'T00:00:00').getTime()

  if (medcertType && medcertExpiration) {
    req.db.run('INSERT or REPLACE INTO certs_med (user, type, expiration) VALUES (?, ?, ?) ', formData.user_id, medcertType, medcertExpiration)
  } else if (!medcertType) {
    req.db.run('DELETE FROM certs_med where user = ?', formData.user_id)
  } else {
    return res.sendStatus(400).json({ error: 'Form data malformed: Submitted with just one of medcert type and expiration date.' })
  }

  if (formData.new_user === 'true') {
    res.set('HX-Redirect', '/all-trips')
    return res.sendStatus(200)
  }

  return getProfileCard(req, res)
}

// NOTE: I really should have been more consistent with "driver" or "vehicle"
// I kinda liked "vehicle" but I realized I shouldn't change all the wording unless OPO is fine with it
const VALID_VEHICLE_CERTS = ['VAN', 'MINIVAN', 'TRAILER']
export function getDriverCertRequest(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  // TODO this is a little gnarly and could be cleaned up
  const driver_certs = req.db.all('SELECT cert, is_approved FROM certs_vehicles WHERE user = ?', userId)
  const checkboxes = VALID_VEHICLE_CERTS.map(cert => {
    const userCert = driver_certs.find(item => item.cert === cert)
    const attributes = userCert ? `checked ${userCert.is_approved && !res.locals.is_opo ? 'disabled ' : ''}` : ''
    return `<label><input ${attributes}type=checkbox name=vehicle_cert value=${cert}></input>${cert}</label>`
  })
  const form = `
<form hx-boost=true
      hx-push-url=false
      action=/profile/${userId}/driver-cert
      method=post class="driver-cert">
<div class="checkbox-row">${checkboxes.join('\n')}</div>
<div class="button-row">
  <button class="action deny" hx-get="/profile/${userId}?card=true">Cancel</button>
  <button class="action approve" type=submit>Save</button>
</div>
</form>
  `
  res.send(form).status(200)
}

export function postDriverCertRequest(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  // If you're the user, delete all the *pending* requests and add the new ones
  // If you're OPO, you can just delete all the requests
  req.db.run(`DELETE FROM certs_vehicles WHERE user = ? ${!res.locals.is_opo ? 'and is_approved = 0' : ''}`, userId)

  // If the body is empty, that means the user has removed their certs, and we're done
  if (!req.body.vehicle_cert) return getProfileCard(req, res)

  // body-parser weirdness: if there's a single value it's a string, if there's multiple it's an
  // array of strings
  const is_approved = res.locals.is_opo === true ? 1 : 0
  const certs_vehicles = typeof req.body.cert === 'string' ? [req.body.cert] : req.body.cert
  certs_vehicles
    .filter(cert => VALID_VEHICLE_CERTS.includes(cert))
    .map(cert => req.db.run(
      'INSERT OR IGNORE INTO certs_vehicles (user, cert, is_approved) VALUES (?, ?, ?)',
      userId, cert, is_approved
    )) // INSERT OR IGNORE so that existing, approved certs will not be overwritten

  return getProfileCard(req, res)
}

export function getClubLeadershipRequest(req, res) {
  const userId = parseInt(req.params.userId)

  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const certs_med = req.db.get('SELECT type, expiration FROM certs_med WHERE user = ?', userId)
  if (!certs_med) {
    // NOTE: I think I'd like to organize all warning message templates but I don't want to decide on where that will be yet...
    return res.render('profile/no-medcert-warning.njk', { userId })
  }

  const clubs_with_user = req.db.all(`
    SELECT clubs.id, name, opo_approved
    FROM club_leaders
    LEFT JOIN clubs ON clubs.id = club_leaders.club
    WHERE user = ?
    ORDER BY name
  `, userId)

  const clubs_without_user = req.db.all(`
    SELECT id, name
    FROM clubs
    WHERE active = 1 AND NOT EXISTS
      (SELECT *
      FROM club_leaders AS cl
      WHERE user = ? AND cl.club = clubs.id
      )
    ORDER BY name
  `, userId)

  return res.render('profile/club-leadership-form.njk', { userId, clubs_with_user, clubs_without_user })

  /*

  const clubListItems = userClubs.map(club => `

  <li>${club.name}${club.opo_approved === 0 ? ' (pending)' : ''}
  <button
          hx-delete="/profile/${userId}/club-leadership/${club.id}"
          hx-confirm="Are you sure you want to remove yourself as a${club.opo_approved === 0 ? ' (pending)' : ''} leader of ${club.name}?"
          hx-target="closest li"
          hx-swap="outerHTML"
  ><img src="/static/icons/close-icon.svg"></button>
  `)
  const options = clubsWithoutUser.map(club => `<option value=${club.id}>${club.name}</option>`)
  const form = `

<form hx-boost=true
      hx-push-url=false
      action=/profile/${userId}/club-leadership
      method=post class="club-leadership-request">
<ul>${clubListItems.join(' ')}</ul>
<div>
  <select name=club>${options}</select>
  <button class="action approve" type=submit>Request</button>
</div>
  <button class="action deny" hx-get="/profile/${userId}?card=true">Close</button>
</form>
  `
  res.send(form).status(200)
  */
}

export function postClubLeadershipRequest(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const club = req.body.club
  if (!club) return res.sendStatus(400)

  const opo_approved = res.locals.is_opo === true ? 1 : 0
  // NOTE: should chairs auto-approve themselves?
  req.db.run('INSERT INTO club_leaders (user, club, opo_approved) VALUES (?, ?, ?)',
    userId, club, opo_approved)
  return getProfileCard(req, res)
}

export function deleteClubLeadershipRequest(req, res) {
  const userId = parseInt(req.params.userId)
  const clubId = parseInt(req.params.clubId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)
  const { changes } = req.db
    .run('DELETE FROM club_leaders WHERE user = ? AND club = ?', userId, clubId)

  if (changes < 1) return res.sendStatus(400)

  return getClubLeadershipRequest(req, res)
}

export function getClubChairRequest(req, res) {
  const userId = parseInt(req.params.userId)

  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const clubs_with_user = req.db.all(`
    SELECT clubs.id, name, is_approved
    FROM club_chairs
    LEFT JOIN clubs ON clubs.id = club_chairs.club
    WHERE user = ?
    ORDER BY name
  `, userId)

  const clubs_without_user = req.db.all(`
    SELECT id, name
    FROM clubs
    WHERE active = 1 AND NOT EXISTS
      (SELECT *
      FROM club_chairs AS chair
      WHERE user = ? AND chair.club = clubs.id
      )
    ORDER BY name
  `, userId)

  return res.render('profile/club-chair-form.njk', { userId, clubs_with_user, clubs_without_user })
}

export function postClubChairRequest(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const club = req.body.club
  if (!club) return res.sendStatus(400)

  const today = Math.floor(new Date().getTime())
  // NOTE: this is actually so ugly and surely should use a better function...
  const is_approved = res.locals.is_opo === true ? 1 : 0
  req.db.run('INSERT INTO club_chairs (user, club, chair_since, is_approved) VALUES (?, ?, ?, ?)',
    userId, club, today, is_approved)
  return getProfileCard(req, res)
}
export function deleteClubChairRequest(req, res) {
  const userId = parseInt(req.params.userId)
  const clubId = parseInt(req.params.clubId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const { changes } = req.db
    .run('DELETE FROM club_chairs WHERE user = ? AND club = ?', userId, clubId)

  if (changes < 1) return res.sendStatus(400)
  return getClubChairRequest(req, res)
}
