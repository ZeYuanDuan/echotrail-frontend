<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { Button } from '@/components/ui/button'
import { useEcho } from '@/composables/useEcho'
const { allEvents, state, discuss, status } = useEcho()
const router = useRouter()
const showV2 = ref(false)
const v1Event = computed(() => state.events.slice(-1)[0])
const quarter = ref(3)
const year = ref(2026)
const yearOpen = ref(true)
const events = computed(() =>
  year.value === 2026 ? allEvents.value.filter((e) => e.quarter === quarter.value) : [],
)
const selectedId = ref<number | undefined>(6)
watch(events, () => {
  selectedId.value = events.value.slice(-1)[0]?.id
})
const selected = computed(() => events.value.find((e) => e.id === selectedId.value))
const moods = computed(() =>
  quarter.value === 2
    ? [
        { name: '四月', score: 6 },
        { name: '五月', score: 8 },
        { name: '六月', score: 3 },
      ]
    : [
        { name: '七月', score: 4 },
        { name: '八月', score: null },
        { name: '九月', score: null },
      ],
)
function toggleYear() {
  year.value = 2026
  yearOpen.value = !yearOpen.value
}
function selectQuarter(q: number) {
  quarter.value = q
  year.value = 2026
}
function review() {
  if (selected.value) {
    discuss(selected.value)
    void router.push('/')
  }
}
</script>
<template>
  <div class="dashboard-content">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <h1 class="h1">My Trail</h1>
      <Button
        variant="outline"
        type="button"
        :aria-expanded="showV2"
        aria-controls="trail-v2"
        @click="showV2 = !showV2"
      >
        {{ showV2 ? '收起 V2 假資料' : '查看 V2 假資料' }}
      </Button>
    </header>
    <EchoCard v-if="!showV2 && v1Event" :event="v1Event" />
    <section v-else-if="!showV2" class="card empty-state">
      <div>🌱</div>
      <h2>還沒有留下事件</h2>
      <p>完成一段對話並更新至 Dashboard，第一筆事件就會出現在這裡。</p>
      <RouterLink to="/" class="update-btn">開始聊聊</RouterLink>
    </section>
    <div id="trail-v2" v-show="showV2" class="trail-layout" style="padding: 0">
      <aside class="trail-side">
        <button class="year-toggle" :aria-expanded="yearOpen" @click="toggleYear">
          {{ yearOpen ? '▼' : '▶' }} 2026
        </button>
        <ul v-if="yearOpen" class="q-list">
          <li v-for="q in 4" :key="q">
            <button
              :class="year === 2026 && quarter === q ? 'q-selected' : 'q-clickable'"
              :aria-pressed="year === 2026 && quarter === q"
              @click="selectQuarter(q)"
            >
              ▶ Q{{ q }}
            </button>
          </li>
        </ul>
        <button class="year-toggle-old" @click="year = 2025">▶ 2025</button>
      </aside>
      <div class="trail-content">
        <p class="demo-note">{{ year }} 年 Q{{ quarter }} · 職涯軌跡</p>
        <div v-if="events.length" class="card">
          <div class="trail-summary-row">
            <div class="ts-card">
              <h2>本季共鳴次數</h2>
              <div class="ts-num">{{ events.length }}</div>
            </div>
            <div class="ts-card">
              <h2>本季的我</h2>
              <div class="ts-kw">
                <span>• 比較焦慮</span><span>• 自我懷疑</span
                ><span>• {{ quarter === 2 ? '自我覺察' : '過度分析' }}</span>
              </div>
            </div>
            <div class="ts-card">
              <h2>本季心情</h2>
              <div class="mood-legend-row"><span>😢</span><span>😐</span><span>😄</span></div>
              <div v-for="mood in moods" :key="mood.name" class="mood-item">
                <span class="mood-name">{{ mood.name }}</span
                ><template v-if="mood.score !== null"
                  ><div class="mood-bar-wrap">
                    <div class="mood-bar-bg" :style="{ width: `${mood.score * 10}%` }"></div>
                  </div>
                  <span class="mood-score">{{ mood.score }}分</span></template
                ><span v-else class="mood-empty">無內容</span>
              </div>
            </div>
          </div>
        </div>
        <div v-if="events.length" class="card">
          <div class="event-cards-row">
            <button
              v-for="event in events"
              :key="event.id"
              class="event-card2"
              :class="{ selected: selectedId === event.id }"
              :aria-pressed="selectedId === event.id"
              @click="selectedId = event.id"
            >
              <span class="timeline-dot"></span>事件 {{ event.id }}：{{ event.title
              }}<span class="ec2-date">{{ event.date }}</span
              ><span v-if="event.isNew" class="new-tag">NEW</span>
            </button>
          </div>
          <div v-if="selected" class="event-detail-box">
            <button class="review-btn" :disabled="status.busy" @click="review">
              回顧／重新討論 ＞</button
            ><EchoCard :event="selected" />
          </div>
        </div>
        <div v-else class="card empty-state">
          <div>🌱</div>
          <h2>這段時間還沒有留下足跡</h2>
          <p>先和艾可聊聊，整理你的第一張 Echo Card。</p>
          <RouterLink to="/" class="update-btn">開始聊聊</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>
