import test from 'node:test'
import assert from 'node:assert/strict'

import * as sqlite from '../src/services/sqlite.js'

test('sqlite', () => {
  test('it opens an empty in-memory database for testing', () => {
    sqlite.start()
    assert.equal(sqlite.getDatabaseFile(), '')
    sqlite.stop()
  })
})
