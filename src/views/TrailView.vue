<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import EchoCard from '@/components/echo/EchoCard.vue'
import { useIdentity } from '@/composables/useIdentity'
import { useTrail } from '@/composables/useTrail'

const { user } = useIdentity()
const { events, busy, error, load } = useTrail()
const selectedId = ref<string | null>(null)

const selectedIndex = computed(() =>
  events.value.findIndex((event) => event.id === selectedId.value),
)
const selected = computed(() => events.value[selectedIndex.value])

watch(events, (nextEvents) => {
  if (!nextEvents.some((event) => event.id === selectedId.value)) {
    selectedId.value = nextEvents[nextEvents.length - 1]?.id ?? null
  }
})

onMounted(() => {
  if (user.value) void load(user.value.id)
})

function retry() {
  if (user.value) void load(user.value.id)
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    month: 'numeric',
    day: 'numeric',
  }).format(new Date(iso))
}

function time(iso: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function fullDate(iso: string) {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function selectEvent(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}
</script>

<template>
  <div class="dashboard-content trail-page">
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
    <section v-else class="trail-explorer" aria-label="職涯事件">
      <nav class="trail-timeline-wrap" aria-label="事件時間軸">
        <ol class="trail-timeline">
          <li v-for="(event, index) in events" :key="event.id" class="trail-timeline-item">
            <button
              type="button"
              class="trail-node"
              :class="{ selected: selectedId === event.id }"
              :aria-pressed="selectedId === event.id"
              :aria-label="`${selectedId === event.id ? '收合' : '查看'}事件 ${index + 1}，${fullDate(event.createdAt)}，${event.card.title}`"
              data-test="trail-event"
              :data-event-id="event.id"
              @click="selectEvent(event.id)"
            >
              <span class="trail-node-marker" aria-hidden="true">
                <span>{{ index + 1 }}</span>
              </span>
              <span class="trail-node-copy">
                <span class="trail-node-date-row">
                  <span class="trail-node-date">{{ shortDate(event.createdAt) }}</span>
                  <span class="trail-node-separator" aria-hidden="true">・</span>
                  <span class="trail-node-time">{{ time(event.createdAt) }}</span>
                </span>
                <span class="trail-node-title">{{ event.card.title }}</span>
              </span>
            </button>

            <div
              v-if="selectedId === event.id"
              :key="`mobile-${event.id}`"
              class="trail-event-detail trail-mobile-detail"
              aria-live="polite"
            >
              <EchoCard :card="event.card" :label="`事件 ${index + 1}`" />
            </div>
          </li>
        </ol>
      </nav>

      <div
        v-if="selected"
        :key="selected.id"
        class="trail-event-detail trail-desktop-detail"
        aria-live="polite"
      >
        <EchoCard :card="selected.card" :label="`事件 ${selectedIndex + 1}`" />
      </div>
    </section>
  </div>
</template>
