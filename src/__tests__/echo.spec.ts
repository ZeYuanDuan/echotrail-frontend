import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useEcho } from '@/composables/useEcho'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
import { demoConversations } from '@/mocks/echo'

vi.mock('@/lib/llm', () => ({ chatLlm: vi.fn(), generateInsightLlm: vi.fn() }))

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
  it('provides three complete fixed conversation scenarios', () => {
    expect(demoConversations).toHaveLength(3)
    expect(new Set(demoConversations.map((conversation) => conversation.id)).size).toBe(3)
    expect(demoConversations.every((conversation) => conversation.turns.length === 3)).toBe(true)
    expect(
      demoConversations.every((conversation) => conversation.turns.every((turn) => turn.trim())),
    ).toBe(true)
  })

  it('keeps live history separate and sends previous turns without persisting them', async () => {
    echo.state.draft = '示範草稿'
    await nextTick()
    const stored = localStorage.getItem('echotrail-demo-v1')
    echo.toggleLive()
    vi.mocked(chatLlm).mockResolvedValue({ text: '你在意哪個部分？' })
    echo.state.draft = '虛構：小晴完成海報'
    await echo.send()
    echo.state.draft = '她很開心'
    await echo.send()
    expect(vi.mocked(chatLlm).mock.calls[1]?.[0].slice(0, 3)).toEqual([
      { role: 'user', text: '虛構：小晴完成海報' },
      { role: 'echo', text: '你在意哪個部分？' },
      { role: 'user', text: '她很開心' },
    ])
    expect(localStorage.getItem('echotrail-demo-v1')).toBe(stored)
    await echo.generateInsight()
    expect(echo.state.insight).toBeNull()
    echo.toggleLive()
    expect(echo.state.draft).toBe('示範草稿')
    echo.toggleLive()
    expect(echo.state.messages).toHaveLength(4)
    echo.newChat()
    expect(echo.state.messages).toHaveLength(0)
  })

  it('restores failed input and prevents mode changes during a live request', async () => {
    echo.toggleLive()
    vi.mocked(chatLlm).mockRejectedValue(new Error('offline'))
    echo.state.draft = '虛構訊息'
    const pending = echo.send()
    echo.toggleLive()
    expect(echo.live.value).toBe(true)
    await pending
    expect(echo.state.messages).toHaveLength(0)
    expect(echo.state.draft).toBe('虛構訊息')
    expect(echo.status.error).toBeTruthy()
    expect(echo.status.busy).toBe(false)
  })
  it('generates a grounded live card with dashboard signals', async () => {
    echo.toggleLive()
    vi.mocked(chatLlm).mockResolvedValue({ text: '你做對了哪個判斷？' })
    vi.mocked(generateInsightLlm).mockResolvedValue({
      card: {
        title: '需求探索成功',
        happen: ['先訪談再設計'],
        emotion: '有成就感',
        like: '我擅長拆解問題',
        dislike: '我不喜歡把需求直接當答案',
        value: '先理解真正問題再行動',
        quote: '我很有成就感',
      },
      signals: [
        {
          framework: 'riasec',
          dimension: 'I',
          strength: 8,
          evidenceQuote: '先理解真正問題',
        },
      ],
      dashboard: {
        persona: {
          headline: '先理解問題再行動的產品工作者',
          summaries: ['擅長拆解問題'],
          quote: '我很有成就感',
        },
        anchor: {
          primary: '專家達人',
          ability: ['拆解問題'],
          motivation: ['解決真正問題'],
          values: ['先理解再行動'],
        },
        keywords: [
          { text: '理解', weight: 5 },
          { text: '問題', weight: 4 },
          { text: '行動', weight: 3 },
        ],
        patterns: [{ title: '先釐清再行動', evidenceQuote: '先理解真正問題' }],
        northStar: {
          primaryAnchor: '專家達人',
          tagline: '用理解創造價值',
          desires: ['解決真正問題'],
          bottomLine: '不把需求直接當答案',
          nextSteps: ['提早進行需求探索'],
        },
      },
    })
    echo.state.draft = '我很有成就感，因為我會先理解真正問題'
    await echo.send()
    await echo.generateInsight()
    expect(echo.state.insight?.id).toBe(1)
    expect(echo.state.insight?.title).toBe('需求探索成功')
    expect(echo.state.insight?.signals?.[0]?.dimension).toBe('I')
  })
  it('saves the actual conversation, updates the trail once, and persists it', async () => {
    echo.state.draft = '工程師離職了，我有點累'
    await complete(echo.send)
    expect(echo.state.messages).toHaveLength(2)
    expect(echo.state.messages[0]?.text).toBe('工程師離職了，我有點累')
    await complete(echo.generateInsight)
    expect(echo.state.insight?.happen).toEqual(['工程師離職了，我有點累'])
    await complete(echo.saveInsight)
    await complete(echo.saveInsight)
    expect(echo.allEvents.value).toHaveLength(6)
    expect(echo.updated.value).toBe(true)
    echo.state.draft = '後來我想先跟主管討論成長機會'
    await complete(echo.send)
    await complete(echo.generateInsight)
    expect(echo.saved.value).toBe(false)
    await complete(echo.saveInsight)
    expect(echo.allEvents.value).toHaveLength(6)
    expect(echo.allEvents.value[0]?.quote).toBe('後來我想先跟主管討論成長機會')
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
