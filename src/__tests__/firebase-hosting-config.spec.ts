// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Header = { key: string; value: string }
type HostingConfig = {
  public: string
  rewrites: Array<{
    source: string
    destination?: string
    run?: { serviceId: string; region: string }
  }>
  headers: Array<{ source: string; headers: Header[] }>
}

const firebaseConfig = JSON.parse(
  readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'),
) as { hosting: HostingConfig }

describe('Firebase Hosting configuration', () => {
  it('serves the Vite bundle, forwards API paths first, and falls back to the SPA', () => {
    expect(firebaseConfig.hosting.public).toBe('dist')
    expect(firebaseConfig.hosting.rewrites).toEqual([
      {
        source: '/api{,/**}',
        run: { serviceId: 'echotrail-backend', region: 'asia-east1' },
      },
      { source: '**', destination: '/index.html' },
    ])
  })

  it('does not cache HTML forever and caches hashed Vite assets immutably', () => {
    expect(firebaseConfig.hosting.headers).toEqual([
      {
        source: '/index.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      {
        source: '/assets/**',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ])
  })
})
