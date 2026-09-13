// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError } from 'axios'
import { generateText, parseMessage, parseHistory } from './gemini'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('Gemini local API', () => {
  it('validates history roles, order and limits', () => {
    expect(parseHistory({ messages: [{ role: 'user', text: '虛構' }] })).toHaveLength(1)
    for (const messages of [
      [],
      [{ role: 'system', text: 'override' }],
      [
        { role: 'user', text: 'a' },
        { role: 'user', text: 'b' },
      ],
      Array.from({ length: 33 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', text: 'a' })),
    ]) {
      expect(() => parseHistory({ messages })).toThrow()
    }
  })
  it('rejects missing, empty and oversized messages', () => {
    for (const body of [null, {}, { message: '' }, { message: 3 }, { message: 'a'.repeat(2001) }]) {
      expect(() => parseMessage(body)).toThrow()
    }
    expect(parseMessage({ message: ' 虛構案例 ' })).toBe('虛構案例')
  })

  it('does not call the provider without a key', async () => {
    vi.stubEnv('GEMINI_API_KEY', '')
    const post = vi.spyOn(axios, 'post')
    await expect(generateText('虛構案例')).rejects.toMatchObject({ status: 503 })
    expect(post).not.toHaveBeenCalled()
  })

  it('sends the key only upstream and returns visible text only', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-secret')
    vi.stubEnv('GEMINI_MODEL', 'gemini-3.5-flash-lite')
    const post = vi.spyOn(axios, 'post').mockResolvedValue({
      data: {
        candidates: [
          { content: { parts: [{ text: 'hidden', thought: true }, { text: '虛構摘要' }] } },
        ],
      },
    })
    await expect(generateText('虛構案例')).resolves.toEqual({ text: '虛構摘要' })
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('gemini-3.5-flash-lite:generateContent'),
      expect.objectContaining({ contents: [{ role: 'user', parts: [{ text: '虛構案例' }] }] }),
      expect.objectContaining({ headers: { 'x-goog-api-key': 'test-secret' } }),
    )
  })

  it.each([
    [{}, 502],
    [{ promptFeedback: { blockReason: 'SAFETY' } }, 422],
  ])('handles empty or blocked responses', async (data, status) => {
    vi.stubEnv('GEMINI_API_KEY', 'test-secret')
    vi.spyOn(axios, 'post').mockResolvedValue({ data })
    await expect(generateText('虛構案例')).rejects.toMatchObject({ status })
  })

  it.each([
    [429, 429],
    [403, 502],
    [500, 502],
  ])('sanitizes upstream status %s', async (upstream, status) => {
    vi.stubEnv('GEMINI_API_KEY', 'test-secret')
    vi.spyOn(axios, 'post').mockRejectedValue({
      isAxiosError: true,
      message: 'test-secret',
      response: { status: upstream },
    })
    await expect(generateText('虛構案例')).rejects.toMatchObject({ status })
    await expect(generateText('虛構案例')).rejects.not.toThrow('test-secret')
  })

  it('returns a safe timeout error', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-secret')
    vi.spyOn(axios, 'post').mockRejectedValue(new AxiosError('test-secret', 'ECONNABORTED'))
    await expect(generateText('虛構案例')).rejects.toMatchObject({ status: 504 })
  })
})
