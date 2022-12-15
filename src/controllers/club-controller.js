import * as db from '../services/sqlite.js'

export async function createClub (req, res) {
  const { name } = req.body
  const id = db.insertClub(name)
  res.json({ message: `Created new club ${name} with ID ${id}` })
}

export async function allClubs (_req, res) {
  const clubs = db.getClubs()
  res.json(clubs)
}

export async function getClubsMap () {
  const clubsList = await getClubsList()
  const map = {}
  clubsList.forEach((club) => {
    const _id = club._id.toString()
    map[_id] = { _id, name: club.name, active: club.active }
  })
  return map
}

async function getClubsList () {
  const clubList = allClubs()
  clubList.sort((a, b) => a.name > b.name ? 1 : -1) // Sort by name, alphabetically
  return clubList
}
