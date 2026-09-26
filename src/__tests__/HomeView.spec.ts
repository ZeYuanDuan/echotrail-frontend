import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useEcho } from '@/composables/useEcho'
import { useIdentity } from '@/composables/useIdentity'
import { conversationScenarios } from '@/data/conversation-scenarios'
import { chatLlm, generateInsightLlm, type InsightResponse } from '@/lib/llm'
import { rebuildDashboard, resolveUser, saveEvent } from '@/lib/persistence'
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
  it('ends a confirmed conversation and starts fresh from the new-conversation action', async () => {
    const previousConversationId = echo.conversationId.value
    const card = {
      title: '已確認洞察',
      happen: ['完成一段對話'],
      emotion: '踏實',
      like: '喜歡整理經驗',
      dislike: '不喜歡遺漏重點',
      value: '留下紀錄',
      quote: '完成一段對話',
    }
    echo.state.messages = [
      { role: 'user', text: '完成一段對話' },
      { role: 'echo', text: '這段經驗已經整理好了。' },
    ]
    echo.state.insight = { card, signals: [] }
    echo.confirmedEvent.value = {
      id: crypto.randomUUID(),
      userId: identity.user.value!.id,
      conversationId: previousConversationId,
      messageStartSeq: 1,
      messageEndSeq: 2,
      createdAt: new Date().toISOString(),
      source: 'conversation',
      card,
      signals: [],
    }
    const wrapper = await mountHome()

    expect(wrapper.find('.input-box').exists()).toBe(false)
    expect(wrapper.get('[data-test="new-conversation"]').text()).toBe('開啟新對話')

    await wrapper.get('[data-test="new-conversation"]').trigger('click')

    expect(echo.conversationId.value).not.toBe(previousConversationId)
    expect(echo.state.messages).toHaveLength(0)
    expect(echo.confirmedEvent.value).toBeNull()
    expect(wrapper.find('.input-box').exists()).toBe(true)
    wrapper.unmount()
  })

  it('shows the animated Dashboard status while confirmation rebuilds automatically', async () => {
    const userId = identity.user.value!.id
    echo.state.messages = [
      { role: 'user', text: '第一段對話' },
      { role: 'echo', text: '請繼續說說看。' },
    ]
    echo.state.insight = {
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
    }
    echo.clientEventId.value = crypto.randomUUID()
    vi.mocked(saveEvent).mockImplementationOnce(async (input) => ({
      id: crypto.randomUUID(),
      userId,
      conversationId: input.conversationId,
      messageStartSeq: 1,
      messageEndSeq: input.messages.length,
      createdAt: new Date().toISOString(),
      source: 'conversation',
      card: input.card,
      signals: input.signals,
    }))
    vi.mocked(rebuildDashboard).mockImplementationOnce(() => new Promise(() => {}))
    const wrapper = await mountHome()

    await wrapper.get('[data-test="confirm-card"]').trigger('click')
    await vi.waitFor(() => expect(rebuildDashboard).toHaveBeenCalledWith(userId))

    const actions = wrapper.find('.dashboard-update-actions')
    expect(actions.find('.update-btn').exists()).toBe(true)
    expect(actions.find('.dashboard-update-status').text()).toBe('正在更新 Dashboard...')
    expect(actions.findAll('.loading-dots span')).toHaveLength(3)
    expect(wrapper.text()).not.toContain('事件已保存。')
    expect(wrapper.find('[data-test="update-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('.chat-messages .thinking').exists()).toBe(false)
    wrapper.unmount()
  })

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
    expect(wrapper.text()).toContain('選擇第 2 輪腳本')

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.scenario-card')).toHaveLength(3)
    expect(wrapper.text()).toContain('選擇第 3 輪腳本')

    await wrapper.findAll('.scenario-card')[2]!.trigger('click')

    expect(wrapper.find('textarea').element.value).toBe(conversationScenarios[2]!.turns[2])

    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.scenario-card')).toHaveLength(0)
    expect(wrapper.text()).toContain('三輪情境已完成')
    wrapper.unmount()
  })

  it('keeps third-round scripts selectable while the second-round Insight is generating', async () => {
    const wrapper = await mountHome()
    await wrapper.findAll('.scenario-card')[0]!.trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await wrapper.findAll('.scenario-card')[1]!.trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    let resolveInsight!: (value: InsightResponse) => void
    vi.mocked(generateInsightLlm).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInsight = resolve
        }),
    )

    await wrapper.get('.insight-btn').trigger('click')
    const thirdRoundScripts = wrapper.findAll('.scenario-card')

    expect(thirdRoundScripts).toHaveLength(3)
    expect(thirdRoundScripts.every((button) => button.attributes('disabled') === undefined)).toBe(
      true,
    )
    await thirdRoundScripts[2]!.trigger('click')
    expect((wrapper.get('#chat-input').element as HTMLTextAreaElement).value).toBe(
      conversationScenarios[2]!.turns[2],
    )

    resolveInsight({
      card: {
        title: '第二輪洞察',
        happen: ['完成第二輪'],
        emotion: '期待',
        like: '喜歡繼續探索',
        dislike: '不喜歡中斷',
        value: '保持好奇',
        quote: '第二輪',
      },
      signals: [],
    })
    await flushPromises()
    wrapper.unmount()
  })

  it('keeps the viewport stable while generating and reveals the Echo Card once', async () => {
    const scrollDescriptor = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView',
    )
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    echo.state.messages = [
      { role: 'user', text: '第一段對話' },
      { role: 'echo', text: '請繼續說說看。' },
    ]
    const insight: InsightResponse = {
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
    }
    let resolveInsight!: (value: InsightResponse) => void
    vi.mocked(generateInsightLlm).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInsight = resolve
        }),
    )
    const wrapper = await mountHome()
    await flushPromises()
    scrollIntoView.mockClear()

    await wrapper.get('.insight-btn').trigger('click')
    expect(scrollIntoView).not.toHaveBeenCalled()

    resolveInsight(insight)
    await flushPromises()

    expect(wrapper.get('[data-test="echo-card-preview"]').text()).toContain('Echo Card 預覽')
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
      behavior: 'smooth',
      block: 'start',
    })

    wrapper.unmount()
    if (scrollDescriptor)
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor)
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
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
    wrapper.unmount()
  })
})
