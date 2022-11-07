import * as mongo from 'mongodb'

const uri = process.env.MONGODB_URI
const client = new mongo.MongoClient(uri)
const database = client.db()

export const trips = database.collection('trips')
export const clubs = database.collection('clubs')
export const users = database.collection('users')
export const assignments = database.collection('assignments')
export const vehicles = database.collection('vehicles')
export const vehicleRequests = database.collection('vehiclerequests')
export const globals = database.collection('globals')
