import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { SelectionButton } from '@/components/ui/selection-button'
import { useEcho } from '@/composables/useEcho'
import type { TrailEvent } from '@/types/echo'
import DashboardView from '@/views/DashboardView.vue'
import TrailView from '@/views/TrailView.vue'

const echo = useEcho()

function makeEvent(id: number, title: string, date: string): TrailEvent {
  return {
    id,
    title,
    date,
    quarter: 3,
    happen: [`${title}的實際內容`],
    emotion: '有感受',
    like: '在意成長',
    dislike: '不喜歡停滯',
    value: '持續累積真實經驗',
    quote: `${title}的原話`,
    signals: [],
    dashboard: {
      persona: { headline: '', summaries: [], quote: '' },
      anchor: { primary: '', ability: [], motivation: [], values: [] },
      keywords: [],
      patterns: [],
      northStar: {
        primaryAnchor: '',
        tagline: '',
        desires: [],
        bottomLine: '',
        nextSteps: [],
      },
    },
  }
}

async function mountTrail() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div>Home</div>' } },
      { path: '/trail', component: TrailView },
    ],
  })
  await router.push('/trail')
  await router.isReady()

  return mount(TrailView, { global: { plugins: [router] } })
}

beforeEach(() => {
  echo.reset()
  localStorage.clear()
})

describe('My Trail', () => {
  it('does not show built-in demo events when no real event is saved', async () => {
    const wrapper = await mountTrail()

    expect(wrapper.findAll('[data-slot="selection-button"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('還沒有留下事件')
  })

  it('shares the same empty-state action component and style with My Dashboard', async () => {
    const trail = await mountTrail()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/dashboard/:section?', component: DashboardView },
      ],
    })
    await router.push('/dashboard')
    await router.isReady()
    const dashboard = mount(DashboardView, { global: { plugins: [router] } })
    const trailAction = trail.find('[data-slot="button"]')
    const dashboardAction = dashboard.find('[data-slot="button"]')

    expect(trailAction.text()).toBe('開始聊聊')
    expect(dashboardAction.text()).toBe('回到對話')
    expect(trailAction.attributes('data-variant')).toBe('echo')
    expect(dashboardAction.attributes('data-variant')).toBe('echo')
    expect(trailAction.attributes('data-size')).toBe('lg')
    expect(dashboardAction.attributes('data-size')).toBe('lg')
    expect(trailAction.classes()).toEqual(dashboardAction.classes())
  })

  it('shows every saved event, selects the latest one, and omits the review action', async () => {
    echo.state.events = [
      makeEvent(1, '第一次真實事件', '9/20'),
      makeEvent(2, '第二次真實事件', '9/21'),
    ]

    const wrapper = await mountTrail()
    const eventButtons = wrapper.findAll('[data-slot="selection-button"]')

    expect(eventButtons).toHaveLength(2)
    expect(wrapper.text()).toContain('所有事件 · 共 2 筆')
    expect(eventButtons[1]?.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.echo-card').text()).toContain('事件 2：第二次真實事件')
    expect(wrapper.text()).not.toContain('回顧／重新討論')

    await eventButtons[0]!.trigger('click')

    expect(eventButtons[0]!.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.echo-card').text()).toContain('事件 1：第一次真實事件')
  })

  it('shares the selection button component with My Dashboard', async () => {
    echo.state.events = [makeEvent(1, '真實事件', '9/20')]
    const trail = await mountTrail()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/dashboard/:section?', component: DashboardView }],
    })
    await router.push('/dashboard/frameworks')
    await router.isReady()
    const dashboard = mount(DashboardView, { global: { plugins: [router] } })

    expect(trail.findComponent(SelectionButton).exists()).toBe(true)
    expect(dashboard.findAllComponents(SelectionButton)).toHaveLength(3)
  })
})
