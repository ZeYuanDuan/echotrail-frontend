<script setup lang="ts">
import { onMounted } from 'vue'
import EchoCard from '@/components/echo/EchoCard.vue'
import { useIdentity } from '@/composables/useIdentity'
import { useTrail } from '@/composables/useTrail'
const { user } = useIdentity()
const { events, busy, error, load } = useTrail()
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
</script>
<template>
  <div class="dashboard-content">
    <h1 class="h1">My Trail</h1>
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
