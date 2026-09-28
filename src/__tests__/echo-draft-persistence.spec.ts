import { beforeEach, expect, it, vi } from 'vitest'
import { useEcho } from '@/composables/useEcho'
import { useIdentity } from '@/composables/useIdentity'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
import { resolveUser, saveEvent, type ConfirmEventInput } from '@/lib/persistence'

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
const user = { id: crypto.randomUUID(), name: '測試者' }
const draftKey = `echotrail-conversation-draft-v1:${user.id}`

beforeEach(async () => {
  identity.switchUser()
  localStorage.clear()
  vi.resetAllMocks()
  vi.mocked(resolveUser).mockResolvedValue(user)
  vi.mocked(chatLlm).mockResolvedValue({ text: '你在意什麼？' })
  vi.mocked(saveEvent).mockImplementation(async (input: ConfirmEventInput) => ({
    id: crypto.randomUUID(),
    userId: input.userId,
    conversationId: input.conversationId,
    messageStartSeq: 1,
    messageEndSeq: input.messages.length,
    createdAt: new Date().toISOString(),
    source: 'conversation',
    card: input.card,
    signals: input.signals,
  }))
  await identity.enter(user.name)
})

it('restores an unfinished conversation and input draft for the same user', async () => {
  echo.state.draft = '我完成了一件很有挑戰的事'
  await echo.send()
  echo.state.draft = '我想再補充'

  expect(JSON.parse(localStorage.getItem(draftKey)!)).toMatchObject({
    version: 1,
    userId: user.id,
    conversationId: echo.conversationId.value,
    messages: [
      { role: 'user', text: '我完成了一件很有挑戰的事' },
      { role: 'echo', text: '你在意什麼？' },
    ],
    draft: '我想再補充',
    segmentStartIndex: 0,
  })

  const conversationId = echo.conversationId.value
  identity.switchUser()
  expect(echo.state.messages).toHaveLength(0)
  await identity.enter(user.name)

  expect(echo.conversationId.value).toBe(conversationId)
  expect(echo.state.messages).toHaveLength(2)
  expect(echo.state.draft).toBe('我想再補充')
})

it('keeps the draft through insight preview and removes it after confirmation or a new chat', async () => {
  echo.state.draft = '這是一段尚未完成的對話'
  await echo.send()
  expect(localStorage.getItem(draftKey)).not.toBeNull()

  vi.mocked(generateInsightLlm).mockResolvedValue({
    card: {
      title: '完成挑戰',
      happen: ['完成一項挑戰'],
      emotion: '有成就感',
      like: '我喜歡解決問題',
      dislike: '我不喜歡停滯',
      value: '持續成長',
      quote: '這是一段尚未完成的對話',
    },
    signals: [],
  })
  await echo.generateInsight()
  expect(localStorage.getItem(draftKey)).not.toBeNull()

  await echo.confirmInsight()
  expect(localStorage.getItem(draftKey)).toBeNull()

  echo.newChat()
  echo.state.draft = '補充後重新形成未完成對話'
  await echo.send()
  expect(localStorage.getItem(draftKey)).not.toBeNull()
  echo.newChat()
  expect(localStorage.getItem(draftKey)).toBeNull()
})
