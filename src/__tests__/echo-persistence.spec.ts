import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { useIdentity } from '@/composables/useIdentity'
import { useEcho } from '@/composables/useEcho'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
import { rebuildDashboard, resolveUser, saveEvent, type ConfirmEventInput } from '@/lib/persistence'
import HomeView from '@/views/HomeView.vue'
vi.mock('@/lib/llm', () => ({ chatLlm: vi.fn(), generateInsightLlm: vi.fn() }))
vi.mock('@/lib/persistence', () => ({
  resolveUser: vi.fn(),
  saveEvent: vi.fn(),
  fetchEvents: vi.fn(),
  fetchDashboard: vi.fn(),
  rebuildDashboard: vi.fn(),
}))
const identity = useIdentity()
const echo = useEcho()
const card = {
  title: '理解問題',
  happen: ['完成訪談'],
  emotion: '有成就感',
  like: '我喜歡理解',
  dislike: '我討厭盲目',
  value: '先理解再行動',
  quote: '我很有成就感',
}
const profile = {
  persona: { headline: '重視理解', summaries: ['會問問題'], quote: '我很有成就感' },
  anchor: { primary: '專家', ability: ['甲'], motivation: ['乙'], values: ['丙'] },
  keywords: [{ text: '理解', weight: 4 }],
  patterns: [{ title: '先理解', evidenceQuote: '我很有成就感' }],
  northStar: {
    primaryAnchor: '專家',
    tagline: '理解後行動',
    desires: ['理解'],
    bottomLine: '不盲目',
    nextSteps: ['繼續'],
  },
}
function saved(input: ConfirmEventInput) {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    conversationId: input.conversationId,
    messageStartSeq: 1,
    messageEndSeq: input.messages.length,
    createdAt: new Date().toISOString(),
    source: 'conversation',
    card: input.card,
    signals: input.signals,
  }
}
beforeEach(async () => {
  identity.switchUser()
  localStorage.clear()
  vi.resetAllMocks()
  vi.mocked(resolveUser).mockResolvedValue({ id: crypto.randomUUID(), name: '小美' })
  await identity.enter('小美')
  vi.mocked(chatLlm).mockResolvedValue({ text: '你怎麼看？' })
  vi.mocked(generateInsightLlm).mockResolvedValue({
    card: structuredClone(card),
    signals: [{ framework: 'riasec', dimension: 'I', strength: 8, evidenceQuote: '有成就感' }],
    dashboard: profile,
  })
  vi.mocked(saveEvent).mockImplementation(async (input) => saved(input))
})
async function preview(text = '我很有成就感，因為我喜歡理解問題。') {
  echo.state.draft = text
  await echo.send()
  await echo.generateInsight()
}
it('previews without persistence, freezes the first payload on ambiguous retry, and appends only a second segment', async () => {
  await preview()
  expect(saveEvent).not.toHaveBeenCalled()
  const conversation = echo.conversationId.value
  echo.editCard('title', '編輯後標題')
  vi.mocked(saveEvent).mockRejectedValueOnce(new Error('network lost'))
  await echo.confirmInsight()
  const firstPayload = structuredClone(vi.mocked(saveEvent).mock.calls[0]![0])
  expect(firstPayload.card.title).toBe('編輯後標題')
  echo.state.insight!.card.title = '後來改掉'
  await echo.confirmInsight()
  expect(vi.mocked(saveEvent).mock.calls[1]![0]).toEqual(firstPayload)
  expect(echo.confirmedEvent.value).not.toBeNull()
  echo.continueConversation()
  await preview('第二張卡我想挑戰新方向。')
  echo.state.insight!.card.quote = '第二張卡我想挑戰新方向。'
  echo.editCard('quote', '第二張卡我想挑戰新方向。')
  await echo.confirmInsight()
  const secondPayload = vi.mocked(saveEvent).mock.calls[2]![0]
  expect(secondPayload.conversationId).toBe(conversation)
  expect(secondPayload.messages).toHaveLength(2)
  expect(secondPayload.messages[0]!.text).toContain('第二張卡')
  expect(secondPayload.messages[0]!.text).not.toContain('我很有成就感')
  echo.newChat()
  expect(echo.conversationId.value).not.toBe(conversation)
})
it('unfreezes after a definitive 400 and ignores a late save for the previous user', async () => {
  await preview()
  vi.mocked(saveEvent).mockRejectedValueOnce(
    Object.assign(new Error('invalid'), {
      isAxiosError: true,
      response: { status: 400, data: { error: '請修正卡片' } },
    }),
  )
  await echo.confirmInsight()
  expect(echo.pendingSavePayload.value).toBeNull()
  echo.editCard('title', '修正後')
  let release!: (value: ReturnType<typeof saved>) => void
  vi.mocked(saveEvent).mockImplementationOnce(
    (input) =>
      new Promise((resolve) => {
        release = (value) => resolve(value)
        void input
      }),
  )
  const pending = echo.confirmInsight()
  identity.switchUser()
  vi.mocked(resolveUser).mockResolvedValueOnce({ id: crypto.randomUUID(), name: '新使用者' })
  await identity.enter('新使用者')
  release(saved(vi.mocked(saveEvent).mock.calls.slice(-1)[0]![0]))
  await pending
  expect(echo.confirmedEvent.value).toBeNull()
  expect(echo.state.insight).toBeNull()
})
it('shows confirm before rebuild and navigates only after rebuild succeeds', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/')
  await router.isReady()
  const wrapper = mount(HomeView, { global: { plugins: [router] } })
  await preview()
  await flushPromises()
  expect(wrapper.find('[data-test="confirm-card"]').exists()).toBe(true)
  expect(rebuildDashboard).not.toHaveBeenCalled()
  await wrapper.get('[data-test="confirm-card"]').trigger('click')
  await flushPromises()
  expect(wrapper.find('[data-test="update-dashboard"]').exists()).toBe(true)
  vi.mocked(rebuildDashboard).mockRejectedValueOnce(new Error('failure'))
  await wrapper.get('[data-test="update-dashboard"]').trigger('click')
  await flushPromises()
  expect(router.currentRoute.value.path).toBe('/')
  expect(wrapper.text()).toContain('Dashboard 更新失敗')
  expect(echo.status.busy).toBe(false)
  vi.mocked(rebuildDashboard).mockResolvedValueOnce({
    id: 1,
    userId: identity.user.value!.id,
    createdAt: new Date().toISOString(),
    sourceRevision: 1,
    sourceEventCount: 1,
    profile,
    frameworks: { scores: { riasec: {}, disc: {}, schein: {} }, evidence: [] },
  })
  await wrapper.get('[data-test="update-dashboard"]').trigger('click')
  await flushPromises()
  await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/dashboard'))
  wrapper.unmount()
})
