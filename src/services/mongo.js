import * as mongo from 'mongodb'

const uri = process.env.MONGODB_URI
const client = new mongo.MongoClient(uri)
const database = client.db()

export const trips = database.collection('trips')
export const clubs = database.collection('clubs')
export const users = database.collection('users')
