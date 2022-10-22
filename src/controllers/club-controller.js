import { clubs } from '../services/mongo.js'
import Club from '../models/club-model.js'

export const createClub = (req, res) => {
  const club = new Club()
  club.name = req.body.name
  club.save()
    .then(() => {
      res.json({ message: 'Club Created' })
    })
    .catch((error) => {
      res.status(500).json({ error })
    })
}

export const allClubs = (req, res) => {
  Club.find({}, (err, clubs) => {
    if (err) {
      res.json(err)
    } else {
      clubs.sort((a, b) => {
        if (a.name > b.name) return 1
        else if (b.name > a.name) return -1
        else return 0
      })
      res.json(clubs)
    }
  })
}

export async function getAll () {
  return clubs.find().toArray()
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
