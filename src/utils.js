export function pick (object, keys) {
  if (!object) return undefined
  const res = {}
  keys.forEach((key) => {
    if (object[key] !== undefined) {
      res[key] = object[key]
    }
  })
  return res
}

export function getBadgeImgElement (name) {
  switch (name) {
    case 'approved':
      return '<img class="badge" alt="Green badge with checkmark icon" src="/icons/approved-badge.svg">'
    case 'denied':
      return '<img class="badge" alt="Red badge with a cross icon" src="/icons/denied-badge.svg">'
    case 'pending':
      return '<img class="badge" alt="Yellow badge with a clock icon" src="/icons/pending-badge.svg">'
    default:
      return '<span>-</span>'
  }
}

export function getClubIcon (clubName) {
  switch (clubName) {
    case 'OPO':
      return '/icons/opo.jpg'
    case 'Cabin and Trail':
      return '/icons/cnt.png'
    case 'Women in the Wilderness':
      return '/icons/wiw.png'
    case 'Surf Club':
      return '/icons/surf.png'
    case 'Mountain Biking':
      return '/icons/dmbc.png'
    case 'Winter Sports':
      return '/icons/wsc.png'
    case 'Timber Team':
      return '/icons/wood.png'
    case 'Mountaineering':
      return '/icons/mountain.png'
    case 'Ledyard':
      return '/icons/ledyard.png'
    case 'People of Color Outdoors':
      return '/icons/poco.png'
    case 'Bait and Bullet':
      return '/icons/bnb.png'
    default:
      return '/icons/doc.png'
  }
}
