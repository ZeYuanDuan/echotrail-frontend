import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import App from '../App.vue'

describe('Application routing', () => {
  it('renders the home screen when opening an unknown URL', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/unknown-page')
    await router.isReady()

    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(router.currentRoute.value.path).toBe('/')
    expect(wrapper.find('h1').text()).toBe('👋 Hi Welcome to EchoTrail!')
    wrapper.unmount()
  })
})
