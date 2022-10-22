import { clubs } from '../services/mongo.js'

export async function createClub (req, res) {
  const club = { name: req.body.name }
  const { insertedId } = await clubs.insertOne(club)
  res.json({ message: `Created new club ${club.name} with ID ${insertedId}` })
}

export async function allClubs (_req, res) {
  const clubs = await getAll()
  res.json(clubs)
}

export async function getAll () {
  const clubList = await clubs.find().toArray()
  clubList.sort((a, b) => a.name > b.name ? 1 : -1) // Sort by name, alphabetically
  return clubList
}

export async function getClubsMap () {
  const clubsList = await getAll()
  const map = {}
  clubsList.forEach((club) => {
    const id = club._id.toString()
    map[id] = { name: club.name, active: club.active }
  })
  return map
}
