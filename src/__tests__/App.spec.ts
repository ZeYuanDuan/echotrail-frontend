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
})
