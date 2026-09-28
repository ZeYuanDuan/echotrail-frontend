import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { useIdentity } from '@/composables/useIdentity'
import App from '../App.vue'

describe('Application routing', () => {
  it('redirects an unknown URL to the home route and gates it by nickname', async () => {
    useIdentity().switchUser()
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/unknown-page')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.text()).toContain('歡迎來到 EchoTrail')
    expect(wrapper.get('h1').classes()).toContain('page-title')
    expect(wrapper.get('.page-subtitle').text()).toBe('輸入暱稱，開始留下你的職涯事件。')
    wrapper.unmount()
  })

  it('redirects the removed analysis frameworks page to the Dashboard overview', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })

    await router.push('/dashboard/frameworks')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('reveals mobile user actions from the settings menu', async () => {
    const identity = useIdentity()
    identity.user.value = { id: crypto.randomUUID(), name: '小美' }
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/')
    await router.isReady()
    const wrapper = mount(App, {
      global: { plugins: [router], stubs: { RouterView: true } },
    })
    const trigger = wrapper.get('.mobile-user-menu-trigger')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.mobile-user-popover').exists()).toBe(false)

    await trigger.trigger('click')

    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(wrapper.get('.mobile-user-name').text()).toBe('小美')
    expect(wrapper.get('.mobile-user-popover button').text()).toBe('切換使用者')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.mobile-user-popover').exists()).toBe(false)
    wrapper.unmount()
    identity.switchUser()
  })
})
