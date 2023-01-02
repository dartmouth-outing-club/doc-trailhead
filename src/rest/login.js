import passport from 'passport'
import * as sqlite from '../services/sqlite.js'

export function post (req, res, next) {
  const db = sqlite.getDb()
  passport.authenticate('cas', async (error, casId) => {
    if (error) { return error }
    if (!casId) { return res.redirect('/') }

    const user = db.getUserByCasId(casId)
    if (!user) {
      const insertedId = db.insertUser(casId)
      console.log(`Created new user ${insertedId} for ${casId}`)
    } else {
      console.log(`Logging in user ${casId}`)
    }
    res.redirect('/home.html')
  })(req, res, next)
}
