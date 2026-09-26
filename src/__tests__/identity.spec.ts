import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { routes } from '@/router'
import { useIdentity } from '@/composables/useIdentity'
import { resolveUser } from '@/lib/persistence'
import App from '@/App.vue'
vi.mock('@/lib/persistence', () => ({
  resolveUser: vi.fn(),
  saveEvent: vi.fn(),
  fetchEvents: vi.fn(),
  rebuildDashboard: vi.fn(),
  fetchDashboard: vi.fn(),
}))
const identity = useIdentity()
beforeEach(() => {
  identity.switchUser()
  localStorage.clear()
  vi.resetAllMocks()
})
function router() {
  return createRouter({ history: createMemoryHistory(), routes })
}
it('requires a nickname, resolves it through the API, and hides previous data on switch', async () => {
  const appRouter = router()
  await appRouter.push('/')
  await appRouter.isReady()
  vi.mocked(resolveUser).mockResolvedValue({ id: crypto.randomUUID(), name: '小美' })
  const wrapper = mount(App, { global: { plugins: [appRouter] } })
  expect(wrapper.find('aside.sidebar').exists()).toBe(false)
  await wrapper.find('form').trigger('submit')
  expect(wrapper.text()).toContain('請輸入暱稱')
  await wrapper.get('input[name="nickname"]').setValue('  小美  ')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(resolveUser).toHaveBeenCalledWith('小美')
  expect(wrapper.find('aside.sidebar').exists()).toBe(true)
  expect(JSON.parse(localStorage.getItem('echotrail-user-v1')!).name).toBe('小美')
  await wrapper.find('aside.sidebar .sidebar-footer button').trigger('click')
  expect(wrapper.find('aside.sidebar').exists()).toBe(false)
  wrapper.unmount()
})
it('ignores a late response from the previous user', async () => {
  let release!: (user: { id: string; name: string }) => void
  vi.mocked(resolveUser).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        release = resolve
      }),
  )
  const pending = identity.enter('舊使用者')
  identity.switchUser()
  vi.mocked(resolveUser).mockResolvedValueOnce({ id: crypto.randomUUID(), name: '新使用者' })
  await identity.enter('新使用者')
  release({ id: crypto.randomUUID(), name: '舊使用者' })
  await pending
  expect(identity.user.value?.name).toBe('新使用者')
})
