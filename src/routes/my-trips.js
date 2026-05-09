import * as utils from '../utils.js'
import dateFormat from 'dateformat'

const _60_DAYS_IN_MS = 5184000000

export function get(req, res) {
  const userId = req.user
  const _24_HOURS_IN_MS = 86400000
  const now = new Date()

  const is_leader_query = `SELECT 1 as is_leader
                           FROM club_leaders 
                           WHERE user = ? and opo_approved = TRUE`

  const is_leader = req.db.get(is_leader_query, userId)?.is_leader === 1

  const can_create_trip = res.locals.is_opo || is_leader

  const tripsQuery = `
        SELECT 
          trips.id, title, location, start_time, end_time, description, leader,
          coalesce(clubs.name, 'None') as club
        FROM trip_members
        JOIN trips ON trips.id = trip_members.trip
        LEFT JOIN clubs ON trips.club = clubs.id
        WHERE 
          trip_members.user = ?
          AND end_time > ?
        ORDER BY start_time ASC
      `
  const trips = req.db.all(tripsQuery, userId, now.getTime() - _24_HOURS_IN_MS)
    .map(trip => ({
      ...trip,
      iconPath: utils.getClubIcon(trip.club),
      time_element: utils.getDatetimeRangeElement(trip.start_time, trip.end_time)
    }))

  const userMedcert = req.db.get('SELECT expiration from certs_med where user = ?', userId)
  const today = new Date().getTime()

  let medcert_status
  const medcert_expiration_date = dateFormat(userMedcert.expiration, 'mm-dd-yyyy')

  const medcertExpired = (today) > userMedcert.expiration
  const medcertExpiringSoon = (today + _60_DAYS_IN_MS) > userMedcert.expiration
  const medcertValid = !medcertExpiringSoon

  if (res.locals.is_opo) {
    medcert_status = "valid"
  } else if (!is_leader) {
    medcert_status = "not_leader"
  } else if (!userMedcert) {
    medcert_status = "not_found"
  } else if (medcertExpired) {
    medcert_status = "expired"
  } else if (medcertExpiringSoon) {
    medcert_status = "expiring_soon"
  } else if (medcertValid) {
    medcert_status = "valid"
  } else {
    // TODO: Log error 
    medcertStatus = medcertStatusEnum.NOT_FOUND
  }

  res.render('views/my-trips.njk', {
    trips,
    medcert_status,
    medcert_expiration_date,
    can_create_trip
  })
}
