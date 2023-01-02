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
