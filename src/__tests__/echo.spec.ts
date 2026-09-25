import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useEcho } from '@/composables/useEcho'
import { conversationScenarios } from '@/data/conversation-scenarios'
import { chatLlm, generateInsightLlm } from '@/lib/llm'

vi.mock('@/lib/llm', () => ({ chatLlm: vi.fn(), generateInsightLlm: vi.fn() }))

const echo = useEcho()
const insightResponse = {
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
      framework: 'riasec' as const,
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
}

beforeEach(() => {
  echo.reset()
  localStorage.clear()
})

afterEach(() => {
  vi.resetAllMocks()
})

describe('Gemini conversation workflow', () => {
  it('provides three complete guided conversation scenarios', () => {
    expect(conversationScenarios).toHaveLength(3)
    expect(new Set(conversationScenarios.map((scenario) => scenario.id)).size).toBe(3)
    expect(conversationScenarios.every((scenario) => scenario.turns.length === 3)).toBe(true)
    expect(
      conversationScenarios.every((scenario) => scenario.turns.every((turn) => turn.trim())),
    ).toBe(true)
  })

  it('uses Gemini by default, sends previous turns, and persists the conversation', async () => {
    vi.mocked(chatLlm)
      .mockResolvedValueOnce({ text: '你在意哪個部分？' })
      .mockResolvedValueOnce({ text: '這件事讓你看見了什麼？' })

    echo.state.draft = '第一段經驗'
    await echo.send()
    echo.state.draft = '我最在意判斷有依據'
    await echo.send()

    expect(vi.mocked(chatLlm).mock.calls[1]?.[0]).toEqual([
      { role: 'user', text: '第一段經驗' },
      { role: 'echo', text: '你在意哪個部分？' },
      { role: 'user', text: '我最在意判斷有依據' },
    ])
    expect(JSON.parse(localStorage.getItem('echotrail-v1')!).messages).toHaveLength(4)
    expect(localStorage.getItem('echotrail-demo-v1')).toBeNull()
  })

  it('restores failed input and reports a Gemini connection error', async () => {
    vi.mocked(chatLlm).mockRejectedValue(new Error('offline'))
    echo.state.draft = '想保留的輸入'

    await echo.send()

    expect(echo.state.messages).toHaveLength(0)
    expect(echo.state.draft).toBe('想保留的輸入')
    expect(echo.status.error).toBeTruthy()
    expect(echo.status.busy).toBe(false)
  })

  it('rejects a message when the conversation would exceed the backend limit', async () => {
    echo.state.messages = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('echo' as const),
      text: '字'.repeat(1_999),
    }))
    echo.state.draft = '字'.repeat(9)

    await echo.send()

    expect(chatLlm).not.toHaveBeenCalled()
    expect(echo.state.draft).toBe('字'.repeat(9))
    expect(echo.status.error).toContain('總長最多 16,000 字')
  })

  it('rejects a message longer than the backend per-message limit', async () => {
    echo.state.draft = '字'.repeat(801)

    await echo.send()

    expect(chatLlm).not.toHaveBeenCalled()
    expect(echo.state.draft).toHaveLength(801)
    expect(echo.status.error).toContain('每則訊息最多 800 字')
  })

  it('generates, saves, and persists a grounded Gemini card', async () => {
    vi.mocked(chatLlm).mockResolvedValue({ text: '你做對了哪個判斷？' })
    vi.mocked(generateInsightLlm).mockResolvedValue(insightResponse)
    echo.state.draft = '我很有成就感，因為我會先理解真正問題'

    await echo.send()
    await echo.generateInsight()
    await echo.saveInsight()
    await nextTick()

    expect(echo.state.insight?.id).toBe(1)
    expect(echo.state.insight?.title).toBe('需求探索成功')
    expect(echo.allEvents.value).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('echotrail-v1')!).events).toHaveLength(1)
  })

  it('clears all generated data without restoring seed events', async () => {
    vi.mocked(chatLlm).mockResolvedValue({ text: '繼續說說看。' })
    echo.state.draft = '一段對話'
    await echo.send()

    echo.reset()

    expect(echo.state.messages).toHaveLength(0)
    expect(echo.state.events).toHaveLength(0)
    expect(echo.allEvents.value).toHaveLength(0)
  })
})
