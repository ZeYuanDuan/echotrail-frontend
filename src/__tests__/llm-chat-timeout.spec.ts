import { afterEach, describe, expect, it, vi } from 'vitest'
import { AxiosError } from 'axios'
import { api } from '@/lib/api'
import { chatLlm } from '@/lib/llm'

const originalAdapter = api.defaults.adapter

describe('chat request deadline', () => {
  afterEach(() => {
    api.defaults.adapter = originalAdapter
    vi.useRealTimers()
  })

  it('waits beyond the backend deadline but stops before the Hosting deadline', async () => {
    vi.useFakeTimers()
    let responseDelay = 52_000
    api.defaults.adapter = (config) =>
      new Promise((resolve, reject) => {
        const responseTimer = setTimeout(
          () =>
            resolve({
              data: { text: '我們先釐清這次疏漏讓你在意的點。' },
              status: 200,
              statusText: 'OK',
              headers: {},
              config,
            }),
          responseDelay,
        )
        setTimeout(() => {
          clearTimeout(responseTimer)
          reject(new AxiosError('timeout', AxiosError.ETIMEDOUT, config))
        }, config.timeout)
      })

    const outcome = chatLlm([{ role: 'user', text: '我在意這次疏漏。' }]).then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await vi.advanceTimersByTimeAsync(52_000)
    expect(await outcome).toEqual({ value: { text: '我們先釐清這次疏漏讓你在意的點。' } })

    responseDelay = 59_000
    const lateOutcome = chatLlm([{ role: 'user', text: '我在意這次疏漏。' }]).then(
      (value) => ({ value }),
      (error) => ({ error }),
    )
    await vi.advanceTimersByTimeAsync(59_000)
    expect(await lateOutcome).toMatchObject({ error: { code: AxiosError.ETIMEDOUT } })
  })
})
