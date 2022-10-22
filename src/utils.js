export function pick (object, keys) {
  const res = {}
  keys.forEach((key) => {
    if (object[key] !== undefined) {
      res[key] = object[key]
    }
  })
  return res
}
