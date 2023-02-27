import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('welcome page', async () => {
  it('it contains the welcome message', async () => {
    const res = await fetch('http://localhost:8080')
    const text = await res.text()
    assert(text.includes('Hello Traveler!'))
  })

  it('it contains the upcoming trips', async () => {
    const res = await fetch('http://localhost:8080')
    const text = await res.text()
    assert(text.includes('<h2>Hartland Dinertour</h2>'))
    assert(text.includes('<h2>Killington Boarders!</h2>'))
    assert(text.includes('<h2>Cardigan Sunrikeeee ☀️</h2>'))
    assert(text.includes('<h2>Billings Overnight + Mount Moriah</h2>'))
  })
})
