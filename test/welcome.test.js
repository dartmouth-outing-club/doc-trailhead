import { test } from 'node:test'
import assert from 'node:assert/strict'

import { startServer } from '../src/server.js'
import TrailheadDatabaseConnection from '../src/services/sqlite.js'

test('welcome page', async (t) => {
  const db = new TrailheadDatabaseConnection()
  db.execFile('./db/trailhead-db-schema.sql')
  db.execFile('./db/seed-data/1-clubs.sql')
  db.execFile('./db/seed-data/2-users.sql')
  db.execFile('./db/seed-data/3-trips.sql')

  const server = startServer(db)
  const port = server.address().port

  await t.test('serves homepage', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/welcome`)
    const body = await res.text()
    assert(body.includes('Hello Traveler!'))
  })

  await t.test('serves homepage', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/welcome`)
    const body = await res.text()
    assert(body.includes('<h2>Hartland Dinertour</h2>'))
    assert(body.includes('<h2>Killington Boarders!</h2>'))
    assert(body.includes('<h2>Cardigan Sunrikeeee ☀️</h2>'))
    assert(body.includes('<h2>Billings Overnight + Mount Moriah</h2>'))
  })

  server.close()
})
