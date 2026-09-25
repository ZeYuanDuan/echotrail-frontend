import { ref, watch } from 'vue'
import { fetchDashboard, rebuildDashboard, type DashboardSnapshot } from '@/lib/persistence'
import { useIdentity } from './useIdentity'

const { user } = useIdentity()
const snapshot = ref<DashboardSnapshot | null>(null)
const busy = ref(false)
const error = ref('')
let generation = 0
let identityGeneration = 0
async function load(userId: string): Promise<void> {
  const current = ++generation
  snapshot.value = null
  error.value = ''
  busy.value = true
  try {
    const result = await fetchDashboard(userId)
    if (current === generation && user.value?.id === userId) snapshot.value = result
  } catch {
    if (current === generation && user.value?.id === userId)
      error.value = '暫時無法讀取 Dashboard，請重試。'
  } finally {
    if (current === generation && user.value?.id === userId) busy.value = false
  }
}
async function rebuild(userId: string): Promise<DashboardSnapshot> {
  const currentIdentity = identityGeneration
  error.value = ''
  busy.value = true
  try {
    const result = await rebuildDashboard(userId)
    if (currentIdentity === identityGeneration && user.value?.id === userId) {
      generation++ // A pending GET may have read the previous saved run.
      if (!snapshot.value || result.id >= snapshot.value.id) snapshot.value = result
    }
    return result
  } finally {
    if (currentIdentity === identityGeneration && user.value?.id === userId) busy.value = false
  }
}
watch(
  () => user.value?.id,
  () => {
    identityGeneration++
    generation++
    snapshot.value = null
    busy.value = false
    error.value = ''
  },
  { flush: 'sync' },
)
export function useDashboard() {
  return { snapshot, busy, error, load, rebuild }
}
