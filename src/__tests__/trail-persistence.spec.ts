import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { useIdentity } from '@/composables/useIdentity'
import { useTrail } from '@/composables/useTrail'
import { fetchEvents, resolveUser, type EventRecord } from '@/lib/persistence'
import TrailView from '@/views/TrailView.vue'
vi.mock('@/lib/persistence', () => ({
  resolveUser: vi.fn(),
  fetchEvents: vi.fn(),
  fetchDashboard: vi.fn(),
  rebuildDashboard: vi.fn(),
  saveEvent: vi.fn(),
}))
const identity = useIdentity()
const trail = useTrail()
const card = {
  title: '事件',
  happen: ['完成一件事'],
  emotion: '開心',
  like: '我喜歡',
  dislike: '我討厭',
  value: '價值',
  quote: '原話',
}
function event(userId: string, title: string): EventRecord {
  return {
    id: crypto.randomUUID(),
    userId,
    conversationId: crypto.randomUUID(),
    messageStartSeq: 1,
    messageEndSeq: 2,
    createdAt: '2026-09-25T00:00:00Z',
    source: 'conversation',
    card: { ...card, title },
    signals: [],
  }
}
beforeEach(async () => {
  identity.switchUser()
  localStorage.clear()
  vi.resetAllMocks()
  vi.mocked(resolveUser).mockResolvedValue({ id: crypto.randomUUID(), name: '小美' })
  vi.mocked(fetchEvents).mockResolvedValue([])
  await identity.enter('小美')
})
it('renders every confirmed event in the API order even on the same date', async () => {
  const id = identity.user.value!.id
  const first = event(id, '第一張')
  const second = event(id, '第二張')
  vi.mocked(fetchEvents).mockResolvedValue([first, second])
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/trail')
  await router.isReady()
  const wrapper = mount(TrailView, { global: { plugins: [router] } })
  await flushPromises()
  expect(
    wrapper
      .findAll('[data-test="trail-event"]')
      .map((element) => element.attributes('data-event-id')),
  ).toEqual([first.id, second.id])
  expect(wrapper.text()).toContain('第一張')
  expect(wrapper.text()).toContain('第二張')
  wrapper.unmount()
})
it('clears old events before a new user request and ignores its late result', async () => {
  const firstId = identity.user.value!.id
  let release!: (events: EventRecord[]) => void
  vi.mocked(fetchEvents).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  const pending = trail.load(firstId)
  identity.switchUser()
  vi.mocked(resolveUser).mockResolvedValueOnce({ id: crypto.randomUUID(), name: '新使用者' })
  await identity.enter('新使用者')
  release([event(firstId, '舊事件')])
  await pending
  expect(trail.events.value).toEqual([])
  expect(trail.error.value).toBe('')
})
it('shows an empty state and a retry on API failure', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/trail')
  await router.isReady()
  const wrapper = mount(TrailView, { global: { plugins: [router] } })
  await flushPromises()
  expect(wrapper.text()).toContain('還沒有留下事件')
  vi.mocked(fetchEvents).mockRejectedValueOnce(new Error('offline'))
  await trail.load(identity.user.value!.id)
  await flushPromises()
  expect(wrapper.text()).toContain('重試')
  wrapper.unmount()
})
