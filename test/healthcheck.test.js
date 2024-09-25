import { test } from 'node:test'
import assert from 'node:assert/strict'

import { startServer } from '../src/server.js'
import TrailheadDatabaseConnection from '../src/services/sqlite.js'

test('welcome page', async (t) => {
  const db = new TrailheadDatabaseConnection()
  db.execFile('./db/trailhead-db-schema.sql')
  const server = startServer(db)
  const port = server.address().port

  await t.test('serves homepage', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/healthcheck`)
    const body = await res.text()
    assert.equal(body, 'OK')
  })

  server.close()
})
