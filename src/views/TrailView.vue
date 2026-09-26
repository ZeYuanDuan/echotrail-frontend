<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { useDashboard } from '@/composables/useDashboard'
import { useIdentity } from '@/composables/useIdentity'
import { useTrail } from '@/composables/useTrail'
const { user } = useIdentity()
const { events, busy, error, load } = useTrail()
const { rebuild } = useDashboard()
const router = useRouter()
const rebuilding = ref(false)
const rebuildError = ref('')
let userGeneration = 0
watch(
  () => user.value?.id,
  () => {
    userGeneration++
    rebuilding.value = false
    rebuildError.value = ''
  },
  { flush: 'sync' },
)
onMounted(() => {
  if (user.value) void load(user.value.id)
})
function retry() {
  if (user.value) void load(user.value.id)
}
function date(iso: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(iso))
}
async function updateDashboard() {
  const identity = user.value?.id
  if (!identity || rebuilding.value || !events.value.length) return
  const generation = userGeneration
  rebuilding.value = true
  rebuildError.value = ''
  try {
    await rebuild(identity)
    if (generation === userGeneration && user.value?.id === identity)
      await router.push('/dashboard')
  } catch (caught) {
    if (generation === userGeneration && user.value?.id === identity) {
      const data: unknown = axios.isAxiosError(caught) ? caught.response?.data : null
      rebuildError.value =
        data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Dashboard 更新失敗，請重試。'
    }
  } finally {
    if (generation === userGeneration && user.value?.id === identity) rebuilding.value = false
  }
}
</script>
<template>
  <div class="dashboard-content">
    <header class="trail-header">
      <h1 class="page-title">My Trail</h1>
      <p class="page-subtitle">沿著時間回看每個重要片刻，點選節點就能切換事件。</p>
    </header>
    <p v-if="busy" role="status">正在讀取事件…</p>
    <div v-else-if="error" role="alert">
      <p>{{ error }}</p>
      <button class="update-btn" @click="retry">重試</button>
    </div>
    <section v-else-if="!events.length" class="card empty-state">
      <div>🌱</div>
      <h2>還沒有留下事件</h2>
      <p>確認 Echo Card 後，事件就會出現在這裡。</p>
      <RouterLink to="/" class="update-btn">開始聊聊</RouterLink>
    </section>
    <div v-else class="flex flex-col gap-6">
      <div class="flex flex-wrap items-center gap-3">
        <button
          data-test="trail-rebuild"
          type="button"
          class="update-btn"
          :disabled="rebuilding"
          @click="updateDashboard"
        >
          {{ rebuilding ? '更新中…' : '更新至 Dashboard' }}
        </button>
        <p v-if="rebuildError" role="alert" class="text-destructive">{{ rebuildError }}</p>
      </div>
      <div
        v-for="(event, index) in events"
        :key="event.id"
        data-test="trail-event"
        :data-event-id="event.id"
      >
        <p class="text-muted-foreground">事件 {{ index + 1 }} · {{ date(event.createdAt) }}</p>
        <EchoCard :card="event.card" :label="`事件 ${index + 1}`" />
      </div>
    </div>
  </div>
</template>
