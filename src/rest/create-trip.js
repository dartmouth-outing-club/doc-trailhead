import * as sqlite from '../services/sqlite.js'

const _12_HOURS_IN_MS = 25600000

export function get (_req, res) {
  const clubs = sqlite.all('SELECT id, name FROM clubs ORDER BY name')

  // TODO *FINALLY* limit this to just active users
  const emails = sqlite.all('SELECT id, email FROM users WHERE email IS NOT NULL')

  // Tiny hack that basically doesn't let you set times before now(ish)
  const now = new Date()
  const today = (new Date(now.getTime() - _12_HOURS_IN_MS)).toISOString().substring(0, 16)

  res.render('views/create-trip.njs', { clubs, emails, today })
}
