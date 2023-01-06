import * as sqlite from '../services/sqlite.js'
import { getBadgeImgUrl } from '../utils.js'

export async function get (req, res) {
  const tripId = req.params.id
  const trip = sqlite.get(`
    SELECT
      trips.id, title, clubs.name as club, start_time, end_time, pickup, description, dropoff,
      location, users.name as owner_name, experience_needed, cost
    FROM trips
    LEFT JOIN clubs ON clubs.id = trips.club
    LEFT JOIN users ON users.id = trips.owner
    WHERE trips.id = ?
  `, tripId)

  trip.icon_path = getBadgeImgUrl('approved')
  trip.leader_names = sqlite.get(`
  SELECT group_concat(name, ', ') as names
  FROM trip_members
  LEFT JOIN users ON users.id = user
  WHERE leader = 1 AND trip = ?
  `, tripId).names

  res.render('trip.njs', trip)
}
