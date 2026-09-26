import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { useIdentity } from '@/composables/useIdentity'
import { useDashboard } from '@/composables/useDashboard'
import {
  fetchDashboard,
  rebuildDashboard,
  resolveUser,
  type DashboardSnapshot,
} from '@/lib/persistence'
import DashboardView from '@/views/DashboardView.vue'
vi.mock('@/lib/persistence', () => ({
  resolveUser: vi.fn(),
  fetchDashboard: vi.fn(),
  fetchEvents: vi.fn(),
  rebuildDashboard: vi.fn(),
  saveEvent: vi.fn(),
}))
const identity = useIdentity()
const dashboard = useDashboard()
function snapshot(userId: string): DashboardSnapshot {
  return {
    id: 1,
    userId,
    createdAt: '2026-09-25T00:00:00Z',
    sourceRevision: 2,
    sourceEventCount: 2,
    profile: {
      persona: { headline: '已保存的人物輪廓', summaries: ['重視理解'], quote: '我很有成就感' },
      anchor: {
        primary: '專家達人',
        ability: ['釐清問題'],
        motivation: ['理解'],
        values: ['先理解'],
      },
      keywords: [{ text: '理解', weight: 4 }],
      patterns: [{ title: '先釐清', evidenceQuote: '我很有成就感' }],
      northStar: {
        primaryAnchor: '專家達人',
        tagline: '理解後行動',
        desires: ['理解'],
        bottomLine: '不盲目',
        nextSteps: ['繼續記錄'],
      },
    },
    frameworks: {
      scores: {
        riasec: { R: 0, I: 80, A: 0, S: 0, E: 0, C: 0 },
        disc: { D: 0, I: 0, S: 0, C: 0 },
        schein: { technical: 70 },
      },
      evidence: [
        {
          eventId: crypto.randomUUID(),
          eventTitle: '事件',
          framework: 'riasec',
          dimension: 'I',
          strength: 8,
          evidenceQuote: '我很有成就感',
        },
      ],
    },
  }
}
beforeEach(async () => {
  identity.switchUser()
  localStorage.clear()
  vi.resetAllMocks()
  vi.mocked(resolveUser).mockResolvedValue({ id: crypto.randomUUID(), name: '小美' })
  vi.mocked(fetchDashboard).mockResolvedValue(null)
  await identity.enter('小美')
})
it('renders only the saved snapshot and its profile, scores, and evidence', async () => {
  const id = identity.user.value!.id
  vi.mocked(fetchDashboard).mockResolvedValue(snapshot(id))
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard')
  await router.isReady()
  const wrapper = mount(DashboardView, { global: { plugins: [router] } })
  await flushPromises()
  expect(wrapper.get('h1').classes()).toContain('page-title')
  expect(wrapper.get('.page-subtitle').text()).toContain('從對話裡看見')
  expect(fetchDashboard).toHaveBeenCalledWith(id)
  expect(wrapper.text()).toContain('已保存的人物輪廓')
  expect(wrapper.text()).toContain('2')
  expect(wrapper.text()).not.toContain('已保存版本')
  expect(wrapper.text()).not.toContain('假資料')
  await router.push('/dashboard/frameworks')
  await flushPromises()
  expect(wrapper.text()).toContain('事件訊號預覽')
  expect(wrapper.text()).toContain('80')
  wrapper.unmount()
})
it('keeps the empty state when no run exists and ignores an old user response', async () => {
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/dashboard')
  await router.isReady()
  const wrapper = mount(DashboardView, { global: { plugins: [router] } })
  await flushPromises()
  expect(wrapper.text()).toContain('第一個洞察還在等你')
  const oldId = identity.user.value!.id
  let release!: (value: DashboardSnapshot | null) => void
  vi.mocked(fetchDashboard).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  const pending = dashboard.load(oldId)
  identity.switchUser()
  vi.mocked(resolveUser).mockResolvedValueOnce({ id: crypto.randomUUID(), name: '新使用者' })
  await identity.enter('新使用者')
  release(snapshot(oldId))
  await pending
  expect(dashboard.snapshot.value).toBeNull()
  wrapper.unmount()
})

it('publishes a successful rebuild even when an overlapping page load read the old snapshot', async () => {
  const id = identity.user.value!.id
  let release!: (value: DashboardSnapshot) => void
  vi.mocked(rebuildDashboard).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  const pending = dashboard.rebuild(id)
  await dashboard.load(id)
  expect(dashboard.snapshot.value).toBeNull()
  const current = snapshot(id)
  release(current)
  await pending
  expect(dashboard.snapshot.value).toEqual(current)
})
