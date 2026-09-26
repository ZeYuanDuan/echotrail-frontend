import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useEcho } from '@/composables/useEcho'
import { useIdentity } from '@/composables/useIdentity'
import { conversationScenarios } from '@/data/conversation-scenarios'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
import { resolveUser } from '@/lib/persistence'
import HomeView from '@/views/HomeView.vue'

vi.mock('@/lib/llm', () => ({
  chatLlm: vi.fn(),
  generateInsightLlm: vi.fn(),
}))
vi.mock('@/lib/persistence', () => ({
  resolveUser: vi.fn(),
  saveEvent: vi.fn(),
  fetchEvents: vi.fn(),
  rebuildDashboard: vi.fn(),
  fetchDashboard: vi.fn(),
}))

const echo = useEcho()
const identity = useIdentity()

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: HomeView }],
  })
  await router.push('/')
  await router.isReady()

  return mount(HomeView, { global: { plugins: [router] } })
}

beforeEach(async () => {
  identity.switchUser()
  echo.reset()
  localStorage.clear()
  vi.mocked(resolveUser).mockResolvedValue({ id: crypto.randomUUID(), name: '測試者' })
  await identity.enter('測試者')
  vi.mocked(chatLlm).mockReset()
  vi.mocked(chatLlm).mockResolvedValue({ text: '請繼續說說看。' })
  vi.mocked(generateInsightLlm).mockReset()
})

describe('Home conversation scenarios', () => {
  it('shows each next round only after sending and allows switching scripts', async () => {
    const wrapper = await mountHome()

    await wrapper.findAll('.scenario-card')[0]!.trigger('click')

    expect(wrapper.find('textarea').element.value).toBe(conversationScenarios[0]!.turns[0])
    expect(wrapper.findAll('.scenario-card')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('選擇第 2 輪腳本')

    await wrapper.findAll('.scenario-card')[2]!.trigger('click')

    expect(wrapper.find('textarea').element.value).toBe(conversationScenarios[2]!.turns[0])
    expect(wrapper.findAll('.scenario-card')).toHaveLength(3)

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.scenario-card')).toHaveLength(3)
    expect(
      wrapper.findAll('.scenario-card').every((button) => button.classes('suggest-card')),
    ).toBe(true)
    expect(wrapper.text()).toContain('選擇第 2 輪腳本')

    await wrapper.findAll('.scenario-card')[1]!.trigger('click')
    expect(wrapper.find('textarea').element.value).toBe(conversationScenarios[1]!.turns[1])

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.scenario-card')).toHaveLength(3)
    expect(wrapper.text()).toContain('選擇第 3 輪腳本')

    await wrapper.findAll('.scenario-card')[2]!.trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.scenario-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('三輪情境已完成')
  })

  it('keeps the input enabled after insight generation and offers regeneration after new chat', async () => {
    vi.mocked(generateInsightLlm).mockResolvedValue({
      card: {
        title: '暫存洞察',
        happen: ['發生一件事'],
        emotion: '有感受',
        like: '喜歡理解問題',
        dislike: '不喜歡草率結論',
        value: '重視理解',
        quote: '第一段對話',
      },
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
    })
    const wrapper = await mountHome()
    const textarea = wrapper.find('textarea')

    await textarea.setValue('第一段對話')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await wrapper.find('.insight-btn').trigger('click')
    await flushPromises()

    expect(textarea.attributes('disabled')).toBeUndefined()
    expect(echo.confirmedEvent.value).toBeNull()

    await textarea.setValue('補充一段新對話')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('.insight-btn').exists()).toBe(true)
    expect(echo.state.insight).toBeNull()
    expect(echo.confirmedEvent.value).toBeNull()
  })
})
