import { ref, watch } from 'vue'
import { fetchEvents, type EventRecord } from '@/lib/persistence'
import { useIdentity } from './useIdentity'

const { user } = useIdentity()
const events = ref<EventRecord[]>([])
const busy = ref(false)
const error = ref('')
let generation = 0
async function load(userId: string): Promise<void> {
  const current = ++generation
  events.value = []
  error.value = ''
  busy.value = true
  try {
    const result = await fetchEvents(userId)
    if (current === generation && user.value?.id === userId) events.value = result
  } catch {
    if (current === generation && user.value?.id === userId)
      error.value = '暫時無法讀取 My Trail，請重試。'
  } finally {
    if (current === generation && user.value?.id === userId) busy.value = false
  }
}
watch(
  () => user.value?.id,
  (id) => {
    generation++
    events.value = []
    error.value = ''
    busy.value = false
    if (id) void load(id)
  },
  { flush: 'sync' },
)
export function useTrail() {
  return { events, busy, error, load }
}
