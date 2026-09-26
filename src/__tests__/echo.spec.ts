import { beforeEach, expect, it, vi } from 'vitest'
import { useEcho } from '@/composables/useEcho'
import { useIdentity } from '@/composables/useIdentity'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
import { resolveUser } from '@/lib/persistence'
vi.mock('@/lib/llm', () => ({ chatLlm: vi.fn(), generateInsightLlm: vi.fn() }))
vi.mock('@/lib/persistence', () => ({
  resolveUser: vi.fn(),
  saveEvent: vi.fn(),
  fetchEvents: vi.fn(),
  rebuildDashboard: vi.fn(),
  fetchDashboard: vi.fn(),
}))
const identity = useIdentity()
const echo = useEcho()
beforeEach(async () => {
  identity.switchUser()
  localStorage.clear()
  vi.resetAllMocks()
  vi.mocked(resolveUser).mockResolvedValue({ id: crypto.randomUUID(), name: '測試者' })
  await identity.enter('測試者')
  vi.mocked(chatLlm).mockResolvedValue({ text: '你在意什麼？' })
})
it('sends only recent chat context while preserving the conversation on screen', async () => {
  for (let index = 0; index < 17; index++) {
    echo.state.draft = `第 ${index} 則訊息`
    await echo.send()
    if (index === 14) {
      echo.state.insight = {
        card: {
          title: '卡',
          happen: ['事'],
          emotion: '喜',
          like: '我喜歡',
          dislike: '我討厭',
          value: '價值',
          quote: '第 14 則訊息',
        },
        signals: [],
        dashboard: {
          persona: { headline: '人', summaries: ['甲'], quote: '第 14 則訊息' },
          anchor: { primary: '專家', ability: ['甲'], motivation: ['乙'], values: ['丙'] },
          keywords: [{ text: '甲', weight: 1 }],
          patterns: [{ title: '甲', evidenceQuote: '第 14 則訊息' }],
          northStar: {
            primaryAnchor: '專家',
            tagline: '甲',
            desires: ['甲'],
            bottomLine: '乙',
            nextSteps: ['丙'],
          },
        },
      }
      echo.confirmedEvent.value = {
        id: crypto.randomUUID(),
        userId: identity.user.value!.id,
        conversationId: echo.conversationId.value,
        messageStartSeq: 1,
        messageEndSeq: 30,
        createdAt: new Date().toISOString(),
        source: 'conversation',
        card: echo.state.insight.card,
        signals: [],
      }
      echo.continueConversation()
    }
  }
  expect(echo.state.messages).toHaveLength(34)
  expect(vi.mocked(chatLlm).mock.calls.slice(-1)[0]?.[0]).toHaveLength(31)
  expect(localStorage.getItem('echotrail-demo-v1')).toBeNull()
})
it('keeps a generated preview out of confirmed state and clears it when chatting continues', async () => {
  echo.state.draft = '我很有成就感'
  await echo.send()
  vi.mocked(generateInsightLlm).mockResolvedValue({
    card: {
      title: '成就',
      happen: ['完成'],
      emotion: '開心',
      like: '我喜歡',
      dislike: '我討厭',
      value: '價值',
      quote: '我很有成就感',
    },
    signals: [],
    dashboard: {
      persona: { headline: '人', summaries: ['甲'], quote: '我很有成就感' },
      anchor: { primary: '專家', ability: ['甲'], motivation: ['乙'], values: ['丙'] },
      keywords: [{ text: '甲', weight: 1 }],
      patterns: [{ title: '甲', evidenceQuote: '我很有成就感' }],
      northStar: {
        primaryAnchor: '專家',
        tagline: '甲',
        desires: ['甲'],
        bottomLine: '乙',
        nextSteps: ['丙'],
      },
    },
  })
  await echo.generateInsight()
  expect(echo.state.insight?.card.title).toBe('成就')
  expect(echo.confirmedEvent.value).toBeNull()
  echo.state.draft = '補充一段對話'
  await echo.send()
  expect(echo.state.messages).toHaveLength(4)
  expect(echo.state.insight).toBeNull()
  expect(echo.confirmedEvent.value).toBeNull()
})
