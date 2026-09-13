import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useEcho } from '@/composables/useEcho'

const echo = useEcho()
async function complete(action: () => Promise<void>) {
  const pending = action()
  await vi.runAllTimersAsync()
  await pending
  await nextTick()
}
beforeEach(() => {
  vi.useFakeTimers()
  echo.reset()
  localStorage.clear()
})
afterEach(() => {
  vi.resetAllMocks()
  vi.useRealTimers()
})

describe('Mock conversation workflow', () => {
  it('saves the actual conversation, updates the trail once, and persists it', async () => {
    echo.state.draft = '工程師離職了，我有點累'
    await complete(echo.send)
    expect(echo.state.messages).toHaveLength(2)
    expect(echo.state.messages[0]?.text).toBe('工程師離職了，我有點累')
    await complete(echo.generateInsight)
    expect(echo.state.insight?.happen).toEqual(['工程師離職了，我有點累'])
    await complete(echo.saveInsight)
    await complete(echo.saveInsight)
    expect(echo.allEvents.value).toHaveLength(7)
    expect(echo.updated.value).toBe(true)
    echo.state.draft = '後來我想先跟主管討論成長機會'
    await complete(echo.send)
    await complete(echo.generateInsight)
    expect(echo.saved.value).toBe(false)
    await complete(echo.saveInsight)
    expect(echo.allEvents.value).toHaveLength(7)
    expect(echo.allEvents.value[6]?.quote).toBe('後來我想先跟主管討論成長機會')
    expect(JSON.parse(localStorage.getItem('echotrail-demo-v1')!).events).toHaveLength(1)
  })
  it('rejects empty and concurrent sends, and allows more than three rounds', async () => {
    await complete(echo.send)
    expect(echo.state.messages).toHaveLength(0)
    echo.state.draft = '第一個問題'
    const pending = echo.send()
    echo.state.draft = '下一個問題'
    await echo.send()
    expect(echo.state.messages).toHaveLength(1)
    await vi.runAllTimersAsync()
    await pending
    for (let i = 0; i < 4; i++) {
      echo.state.draft = `第 ${i} 次補充`
      await complete(echo.send)
    }
    expect(echo.state.messages).toHaveLength(10)
  })
  it('reviews an existing event without duplicating it and resets to six seeds', async () => {
    echo.discuss(echo.allEvents.value[0]!)
    echo.state.draft = '現在我有新的想法'
    await complete(echo.send)
    await complete(echo.generateInsight)
    await complete(echo.saveInsight)
    expect(echo.allEvents.value).toHaveLength(6)
    expect(echo.allEvents.value[0]?.quote).toBe('現在我有新的想法')
    echo.newChat()
    expect(echo.state.messages).toHaveLength(0)
    expect(echo.state.events).toHaveLength(1)
    echo.reset()
    expect(echo.state.events).toHaveLength(0)
    expect(echo.allEvents.value).toHaveLength(6)
  })
})
