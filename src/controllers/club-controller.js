import { ObjectId } from 'mongodb'
import * as db from '../services/sqlite.js'

export async function getClubByName (name) {
  return db.getClubByName(name)
}

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

/**
 * Replace a list of string or club objects with club objects.
 *
 * This function exists to paper over an annoying aspect of our current data
 * setup where sometimes it will store the entire club object as a list of either:
 *  a) string IDs
 *  b) ObjectId IDs
 *  c) full objects
 *
 *  Can be removed once we have better-structured data.
 */
export function enhanceClubList (clubsList, clubsMap) {
  return clubsList.map((club) => {
    if (typeof club === 'string') {
      return clubsMap[club]
    } else if (ObjectId.isValid(club)) {
      return clubsMap[club.toString()]
    } else {
      return club
    }
  })
}

async function getClubsList () {
  const clubList = allClubs()
  clubList.sort((a, b) => a.name > b.name ? 1 : -1) // Sort by name, alphabetically
  return clubList
}
