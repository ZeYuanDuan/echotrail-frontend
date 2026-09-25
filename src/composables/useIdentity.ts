import { ref } from 'vue'
import axios from 'axios'
import { resolveUser, type User } from '@/lib/persistence'

const KEY = 'echotrail-user-v1'
const user = ref<User | null>(null)
const busy = ref(false)
const error = ref('')
let generation = 0

function message(caught: unknown): string {
  const data: unknown = axios.isAxiosError(caught) ? caught.response?.data : null
  return data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
    ? data.error
    : '暫時無法取得使用者，請重試。'
}
async function enter(name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) {
    error.value = '請輸入暱稱。'
    return
  }
  const current = ++generation
  busy.value = true
  error.value = ''
  try {
    const resolved = await resolveUser(trimmed)
    if (current !== generation) return
    user.value = resolved
    localStorage.setItem(KEY, JSON.stringify(resolved))
  } catch (caught) {
    if (current === generation) error.value = message(caught)
  } finally {
    if (current === generation) busy.value = false
  }
}
async function restore(): Promise<void> {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const saved: unknown = JSON.parse(raw)
    if (saved && typeof saved === 'object' && 'name' in saved && typeof saved.name === 'string')
      await enter(saved.name)
  } catch {
    localStorage.removeItem(KEY)
  }
}
function switchUser(): void {
  generation++
  user.value = null
  busy.value = false
  error.value = ''
  localStorage.removeItem(KEY)
}
export function useIdentity() {
  return { user, busy, error, enter, restore, switchUser }
}
