import { BadRequestError, NotFoundError } from '../request/errors.js'
import dateFormat from 'dateformat'
import * as utils from '../utils.js'

const VALID_PHONE = /[0-9]{10,}/
const VALID_MED_CERTS = [
  '(none)',
  'Basic First Aid(+CPR)',
  'WFA',
  'WAFA',
  'WFR',
  'OEC',
  'EMT',
  'W-EMT'
]

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

  res.locals.is_self = req.user === userId
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

  user.today_iso = utils.getDateValueForToday()
  const certs_med = req.db.get('SELECT type, expiration FROM certs_med WHERE user = ?', userId)
  if (certs_med) {
    user.medcert_type = certs_med.type
    const medcert_expiration_date = new Date(certs_med.expiration)
    user.medcert_expiration = dateFormat(medcert_expiration_date, 'mm-dd-yyyy')
    user.medcert_expiration_iso = dateFormat(medcert_expiration_date, 'isoDate')
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

  user.club_roles = req.db.all(`
    SELECT clubs.name as club, iif(is_chair, 'Chair', 'Leader') as role
    FROM club_leaders
    LEFT JOIN clubs ON club_leaders.club = clubs.id
    WHERE user = ?
  `, userId)

  user.requested_club_roles = req.db.all(`
    SELECT clubs.name as club, 'Leader' as role
    FROM club_leader_requests AS clr
    LEFT JOIN clubs ON clr.club = clubs.id
    WHERE user = @userId
    UNION
    SELECT clubs.name as club, 'Chair' as role
    FROM club_chair_requests AS ccr
    LEFT JOIN clubs ON ccr.club = clubs.id
    WHERE user = @userId
  `, { userId })

  user.hide_controls = hideControls
  delete user.is_opo // TODO stop using a SELECT * so you don't have to do this
  return user
}

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
  const medcertExpiration = new Date(formData.medcert_expiration + 'T00:00:00').getTime()

  if (!VALID_MED_CERTS.includes(medcertType)) {
    throw new BadRequestError(`Invalid med cert type: ${medcertType}`)
  }

  if (medcertType === '(none)') {
    req.db.run('DELETE FROM certs_med where user = ?', formData.user_id)
  } else if (medcertType !== 'none' && medcertExpiration) {
    req.db.run(`
      INSERT or REPLACE INTO certs_med (user, type, expiration)
      VALUES (?, ?, ?) `,
    formData.user_id, medcertType, medcertExpiration
    )
  } else {
    throw new BadRequestError('Form data malformed: Submitted with invalid expiration.')
  }

  if (formData.new_user === 'true') {
    res.set('HX-Redirect', '/all-trips')
    return res.sendStatus(200)
  }

  return getProfileCard(req, res)
}

export function getClubLeadershipRequest(req, res) {
  const userId = parseInt(req.params.userId)

  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const clubs_with_user = req.db.all(`
    WITH user_leadership AS (
      SELECT club, 1 as is_approved FROM club_leaders WHERE user = @userId
      UNION
      SELECT club, 0 as is_approved FROM club_leader_requests WHERE user = @userId
    )
    SELECT clubs.id, name, is_approved
    FROM user_leadership
    LEFT JOIN clubs ON clubs.id = user_leadership.club
    ORDER BY name
  `, { userId })

  const clubs_without_user = req.db.all(`
    SELECT id, name
    FROM clubs
    LEFT JOIN club_leaders AS cl ON clubs.id = cl.club AND cl.user = @userId
    LEFT JOIN club_leader_requests AS clr ON clubs.id = clr.club AND clr.user = @userId
    WHERE active = 1 AND cl.user IS NULL AND clr.user IS NULL
    ORDER BY name
  `, { userId })

  return res.render('profile/club-leadership-form.njk', { userId, clubs_with_user, clubs_without_user })
}

export function postClubLeadershipRequest(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const club = req.body.club
  if (!club) return res.sendStatus(400)

  const table_name = res.locals.is_opo ? 'club_leaders' : 'club_leader_requests'
  req.db.run(`INSERT OR REPLACE INTO ${table_name} (user, club) VALUES (?, ?)`,
    userId, club)
  return getProfileCard(req, res)
}

export function deleteClubLeadershipRequest(req, res) {
  const userId = parseInt(req.params.userId)
  const clubId = parseInt(req.params.clubId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  req.db.run('DELETE FROM club_leaders WHERE user = ? AND club = ?', userId, clubId)
  req.db.run('DELETE FROM club_leader_requests WHERE user = ? AND club = ?', userId, clubId)

  return getClubLeadershipRequest(req, res)
}

export function getClubChairRequest(req, res) {
  const userId = parseInt(req.params.userId)

  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const clubs_with_user = req.db.all(`
    WITH user_leadership AS (
      SELECT club, 1 as is_approved FROM club_leaders WHERE user = @userId AND is_chair = TRUE
      UNION
      SELECT club, 0 as is_approved FROM club_chair_requests WHERE user = @userId
    )
    SELECT clubs.id, name, is_approved
    FROM user_leadership
    LEFT JOIN clubs ON clubs.id = user_leadership.club
    ORDER BY name
  `, { userId })

  const clubs_without_user = req.db.all(`
    SELECT id, name
    FROM clubs
    LEFT JOIN club_leaders AS cl ON clubs.id = cl.club AND cl.user = @userId AND is_chair = TRUE
    LEFT JOIN club_chair_requests AS clr ON clubs.id = clr.club AND clr.user = @userId
    WHERE active = 1 AND cl.user IS NULL AND clr.user IS NULL
    ORDER BY name
  `, { userId })

  return res.render('profile/club-chair-form.njk', { userId, clubs_with_user, clubs_without_user })
}

export function postClubChairRequest(req, res) {
  const userId = parseInt(req.params.userId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  const club = req.body.club
  if (!club) return res.sendStatus(400)

  if (res.locals.is_opo) {
    req.db.run(`
      INSERT OR REPLACE INTO club_leaders (user, club, is_chair) VALUES (?, ?, 1)`,
    userId, club)
  } else {
    req.db.run(`
      INSERT OR REPLACE INTO club_chair_requests (user, club) VALUES (?, ?)`,
    userId, club)
  }

  return getProfileCard(req, res)
}
export function deleteClubChairRequest(req, res) {
  const userId = parseInt(req.params.userId)
  const clubId = parseInt(req.params.clubId)
  if (userId !== req.user && !res.locals.is_opo) return res.sendStatus(403)

  req.db.run('UPDATE club_leaders SET is_chair = 0 WHERE user = ? AND club = ?', userId, clubId)
  req.db.run('DELETE FROM club_chair_requests WHERE user = ? AND club = ?', userId, clubId)

  return getClubChairRequest(req, res)
}
