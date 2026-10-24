export function requireAuth(req, res, next) {
  if (!req.oidc.isAuthenticated()) {
    return denyLogin(req, res, next)
  }

  const userId = req.db.get('SELECT id FROM users WHERE net_id = ?', req.oidc.user.netid)?.id

  // If there is a valid user session for that token, then add the user to request and move on
  if (userId) {
    req.user = userId
    // This gets automatically included as a variable for all the templates
    const userInfo = req.db.get(`
      SELECT is_opo, is_profile_complete FROM users WHERE id = ?
    `, userId)

    if (!userInfo) {
      return denyLogin(req, res, next)
    }
    if (!userInfo.is_profile_complete && !req.url.includes('/new-user')) {
      return res.redirect(303, '/new-user')
    }

    res.locals.is_opo = userInfo.is_opo === 1
    res.locals.is_chair = req.db.isChair(req.user)
    return next()
  }

  // Otherwise, invalidate the token we received (redundant, but clean) and deny login
  return denyLogin(req, res, next)
}

/** Allow the request if the user is a leader of ANY club, or an OPO staffer */
export function requireAnyLeader(req, res, next) {
  return requireAuth(req, res, () => {
    if (res.locals.is_opo === true) return next()
    const isLeader = req.db.isLeader(req.user)

    if (isLeader) return next()
    return res.sendStatus(403)
  })
}

/** Allow the request if the user is a chair of ANY club. */
export function requireAnyChair(req, res, next) {
  return requireAuth(req, res, () => {
    const isChair = req.db.isChair(req.user)
    if (isChair) return next()
    return res.sendStatus(403)
  })
}

/** Allow the request if the user is a leader the specific trip, or an OPO staffer */
export function requireTripLeader(req, res, next) {
  return requireAuth(req, res, () => {
    const tripId = req.params.tripId
    if (!tripId) throw new Error('Trip Leader authorization used on a route without a trip.')

    const isLeader = req.db.isLeaderForTrip(tripId, req.user)
    const isCorrectChair = req.db.isChairForTripClub(tripId, req.user)

    // Set a variable that says the current user is a leader for THIS trip
    if (isLeader) res.locals.is_leader_for_trip = true
    // Proceed if user is actual leader, the respective chair for the trip's club, or OPO staff
    if (res.locals.is_opo === true || isCorrectChair || isLeader) return next()

    return res.sendStatus(403)
  })
}

/** Allow the request if the user is an OPO staffer */
export function requireOpo(req, res, next) {
  return requireAuth(req, res, () => {
    if (res.locals.is_opo === true) return next()
    return res.sendStatus(403)
  })
}

export function logout(req, res) {
  req.db.invalidateUserToken(req.user)
  console.log(`Invalidate token for ${req.user}`)
  return sendToLogin(req, res)
}

function sendToLogin(_req, res, _next) {
  return res.redirect('/welcome')
}

function denyLogin(req, res, next) {
  if (req.method === 'GET') {
    return sendToLogin(req, res, next)
  } else {
    return res.sendStatus(401)
  }
}

/**
 * Log the user in as user #1.
 *
 * This function is intended only to be used when the application is in development mode. It sets
 * the browser to use the 'devtoken' cookie, and saves that cookie to log the user in as user #1.
 */
export function devLogin(req, res) {
  if (process.env.NODE_ENV !== 'development') {
    console.error('The dev login route was accessed, which should only be possible in dev mode.')
    return res.sendStatus(404)
  }
  req.db.setTokenUnsafe(1, 'devtoken')
  res.cookie('token', 'devtoken', { secure: true, sameSite: 'Lax' })
  return res.redirect('/')
}
