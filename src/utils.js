export function pick(object, keys) {
  const res = {};
  keys.forEach((key) => {
    res[key] = object[key];
  });
  return res;
}

export function clubsListToMap(clubsList) {
  const map = {};
  clubsList.forEach((club) => {
    const id = club._id.toString();
    map[id] = club.name;
  })
  return map;
}
