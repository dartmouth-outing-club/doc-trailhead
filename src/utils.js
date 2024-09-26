import dateFormat from 'dateformat'

export function formatForTripForTables(trip) {
  const title = trip.title.length < 38 ? trip.title : trip.title.substring(0, 38) + '...'
  const description = trip.description.length < 190
    ? trip.description
    : trip.description.substring(0, 190) + '...'
  return {
    ...trip,
    title,
    description,
    icon_path: getClubIcon(trip.club),
    time_element: getDatetimeRangeElement(trip.start_time, trip.end_time)
  }
}

export function getStatusTag(hasLeft, hasReturned, isLate) {
  if (hasReturned) {
    return '<div class="status-tag returned">Returned</div>'
  } else if (isLate) {
    return '<div class="status-tag late">Late</div>'
  } else if (hasLeft) {
    return '<div class="status-tag left">Left</div>'
  } else {
    return '<div class="status-tag not-left">Not Left</div>'
  }
}

export function getBadgeImgUrl(name) {
  switch (name) {
    case 'approved':
    case 1:
      return '/static/icons/approved-badge.svg'
    case 'denied':
    case 0:
      return '/static/icons/denied-badge.svg'
    case 'pending':
      return '/static/icons/pending-badge.svg'
    default:
      return undefined
  }
}

export function getBadgeImgElement(name) {
  switch (name) {
    case 'approved':
    case 1:
      return '<img class="badge" alt="Green badge with checkmark icon" src="/static/icons/approved-badge.svg">'
    case 'denied':
    case 0:
      return '<img class="badge" alt="Red badge with a cross icon" src="/static/icons/denied-badge.svg">'
    case 'pending':
      return '<img class="badge" alt="Yellow badge with a clock icon" src="/static/icons/pending-badge.svg">'
    default:
      return '<span>-</span>'
  }
}

export function getClubIcon(clubName) {
  switch (clubName) {
    case 'OPO':
      return '/static/icons/opo.jpg'
    case 'Cabin and Trail':
      return '/static/icons/cnt.png'
    case 'Women in the Wilderness':
      return '/static/icons/wiw.png'
    case 'Surf Club':
      return '/static/icons/surf.png'
    case 'Mountain Biking':
      return '/static/icons/dmbc.png'
    case 'Winter Sports':
      return '/static/icons/wsc.png'
    case 'Timber Team':
      return '/static/icons/woodsmen.png'
    case 'Mountaineering':
      return '/static/icons/dmc.png'
    case 'Ledyard':
      return '/static/icons/ledyard.png'
    case 'People of Color Outdoors':
      return '/static/icons/poco.png'
    case 'Bait and Bullet':
      return '/static/icons/bnb.png'
    default:
      return '/static/icons/doc.png'
  }
}

export function getDatetimeElement(unixTime, opts = {}) {
  if (!unixTime) return undefined
  if (typeof unixTime !== 'number') {
    throw new Error(`Unexpected argument ${unixTime} received`)
  }
  const { mode = 'FULL', includeDayOfWeek = true, includeYear = false } = opts
  const date = new Date(unixTime)
  const dateString = dateFormat(date, `${includeDayOfWeek ? 'ddd, ' : ''}m/d${includeYear ? '/yy' : ''}`)
  const timeString = dateFormat(date, 'h:MM TT')
  switch (mode) {
    case 'FULL':
      return `<time datetime="${date.toISOString()}">${dateString} @ ${timeString}</time>`
    case 'DATE':
      return `<time datetime="${date.toISOString()}">${dateString}</time>`
    case 'TIME':
      return `<time datetime="${date.toISOString()}">${timeString}</time>`
    default:
      throw new Error(`Unexpected mode ${mode} received`)
  }
}

export function getDatetimeRangeElement(unixTimeStart, unixTimeEnd, opts = {}) {
  const startDate = new Date(unixTimeStart)
  const endDate = new Date(unixTimeEnd)
  const sameDay = startDate.getDate() === endDate.getDate()
  return `<time datetime="${startDate.toISOString()}">${getDatetimeElement(unixTimeStart, opts)}</time> - <time datetime="${endDate.toISOString()}">${getDatetimeElement(unixTimeEnd, { ...opts, mode: opts.mode === 'TIME' ? 'TIME' : (sameDay ? 'TIME' : 'FULL') })}</time>`
}

const _12_HOURS_IN_MS = 25600000
export function getDatetimeValueForNow() {
  // Tiny client-side hack that that keeps you from setting times before now(ish)
  try {
    const now = new Date()
    const today = (new Date(now.getTime() - _12_HOURS_IN_MS)).toISOString().substring(0, 16)
    return today
  } catch (error) {}
}

export function getDatetimeValueForUnixTime(unixTime) {
  const date = new Date(unixTime)
  return dateFormat(date, "yyyy-mm-dd'T'HH:MM:ss")
}

export function hasTimePassed(unixTime) {
  const now = (new Date()).getTime()
  return now > unixTime
}
