<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import EchoCard from '@/components/echo/EchoCard.vue'
import { Button } from '@/components/ui/button'
import { SelectionButton } from '@/components/ui/selection-button'
import { useEcho } from '@/composables/useEcho'

const { allEvents } = useEcho()
const selectedId = ref<number>()

watch(
  allEvents,
  (events) => {
    if (!events.some((event) => event.id === selectedId.value)) {
      selectedId.value = events[events.length - 1]?.id
    }
  },
  { immediate: true },
)

const selected = computed(() => allEvents.value.find((event) => event.id === selectedId.value))
</script>

<template>
  <div class="dashboard-content">
    <header class="page-header">
      <h1 class="page-title">My Trail</h1>
      <p class="page-subtitle">
        {{
          allEvents.length
            ? `所有事件 · 共 ${allEvents.length} 筆`
            : '每一筆足跡都來自完成的 Gemini 對話。'
        }}
      </p>
    </header>

    <section v-if="!allEvents.length" class="card empty-state">
      <div>🌱</div>
      <h2>還沒有留下事件</h2>
      <p>完成一段對話並更新至 Dashboard，第一筆事件就會出現在這裡。</p>
      <div class="mt-6">
        <Button as-child variant="echo" size="lg">
          <RouterLink to="/">開始聊聊</RouterLink>
        </Button>
      </div>
    </section>

    <div v-else class="trail-content trail-content-generated">
      <div class="card">
        <div class="event-cards-row trail-event-list">
          <SelectionButton
            v-for="event in allEvents"
            :key="event.id"
            :selected="selectedId === event.id"
            :meta="event.date"
            :badge="event.isNew ? 'NEW' : undefined"
            stretch
            @click="selectedId = event.id"
          >
            事件 {{ event.id }}：{{ event.title }}
          </SelectionButton>
        </div>
        <div v-if="selected" class="event-detail-box">
          <EchoCard :event="selected" />
        </div>
      </div>
    </div>
  </div>
</template>
