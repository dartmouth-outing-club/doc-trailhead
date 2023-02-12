import { getProfileData } from '../rest/profile.js'

export function getProfileView (req, res) {
  const data = getProfileData(req.user)
  return res.render('views/profile.njk', data)
}

export function getNewUserView (req, res) {
  const data = getProfileData(req.user)
  return res.render('views/new-user.njk', data)
}
