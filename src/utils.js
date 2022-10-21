export function pick (object, keys) {
  const res = {}
  keys.forEach((key) => {
    if (object[key] !== undefined) {
      res[key] = object[key]
    }
  })
  return res
}

export function clubsListToMap (clubsList) {
  const map = {}
  clubsList.forEach((club) => {
    const id = club._id.toString()
    map[id] = { name: club.name, active: club.active }
  })
  return map
}
