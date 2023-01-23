export function getBadgeImgUrl (name) {
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

export function getBadgeImgElement (name) {
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

export function getClubIcon (clubName) {
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
      return '/static/icons/mountain.png'
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

export function getLongTimeElement (unixTime) {
  if (unixTime === undefined) return undefined
  if (typeof unixTime !== 'number') {
    throw new Error(`Unexpected argument ${unixTime} received`)
  }

  const date = new Date(unixTime)
  const minutes = date.getMinutes()
  const hours = date.getHours()

  const dateString = `${date.getMonth() + 1}/${date.getDate()}`
  const minutesString = minutes < 10 ? '0' + minutes : minutes
  const hoursString = hours > 12 ? `${hours - 12}` : `${hours}`
  const timeString = `${hoursString}:${minutesString} ${hours < 12 ? 'AM' : 'PM'}`
  return `<time datetime="${date.toISOString()}">${dateString} @ ${timeString}</time>`
}

export function getShortTimeElement (unixTime) {
  const date = new Date(unixTime)
  const minutes = date.getMinutes()
  const hours = date.getHours()

  const dateString = `${date.getMonth() + 1}/${date.getDate()}`
  const minutesString = minutes < 10 ? '0' + minutes : minutes
  const hoursString = hours > 12 ? `${hours - 12}` : `${hours}`
  const timeString = `${hoursString}:${minutesString} ${hours < 12 ? 'AM' : 'PM'}`
  return `<time datetime="${date.toISOString()}">${dateString} @ ${timeString}</time>`
}

const _12_HOURS_IN_MS = 25600000
export function getDatetimeValueForNow () {
  // Tiny client-side hack that that keeps you from setting times before now(ish)
  try {
    const now = new Date()
    const today = (new Date(now.getTime() - _12_HOURS_IN_MS)).toISOString().substring(0, 16)
    return today
  } catch (error) {}
}

const _5_HOURS_IN_MS = 1.8e+7
export function getDatetimeValueForUnixTime (unixTime) {
  // Subtract 5 hours so we get that time string in EST
  // All of the time handling code in this app is very hacky, I know that
  try {
    const date = new Date(unixTime - _5_HOURS_IN_MS)
    return date.toISOString().substring(0, 16)
  } catch (error) {}
}
