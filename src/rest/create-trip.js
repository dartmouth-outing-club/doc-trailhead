/* If you're looking for the method to create a trip, that's in /rest/trip.js */
import * as sqlite from '../services/sqlite.js'

const _12_HOURS_IN_MS = 25600000

export function get (req, res) {
  // TODO *FINALLY* limit this to just active users
  const emails = sqlite.all('SELECT id, email FROM users WHERE email IS NOT NULL')
  const clubs = sqlite.all(`
    SELECT clubs.id, clubs.name
    FROM club_leaders
    LEFT JOIN clubs ON clubs.id = club_leaders.club
    WHERE user = ? AND is_approved = 1
    ORDER BY name
    `, req.user)
  console.log(clubs)

  // Tiny client-side hack that that keeps you from setting times before now(ish)
  const now = new Date()
  const today = (new Date(now.getTime() - _12_HOURS_IN_MS)).toISOString().substring(0, 16)

  res.render('views/create-trip.njs', { clubs, emails, today })
}
