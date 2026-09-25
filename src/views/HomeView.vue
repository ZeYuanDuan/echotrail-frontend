<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { conversationScenarios, type ConversationScenario } from '@/data/conversation-scenarios'
import { useEcho } from '@/composables/useEcho'

const { state, status, saved, send, generateInsight, saveInsight } = useEcho()
const router = useRouter()
const bottom = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const selectedScenarioId = ref<string | null>(null)
const conversationTurn = computed(
  () => state.messages.filter((message) => message.role === 'user').length,
)
const selectedScenario = computed(() =>
  conversationScenarios.find((scenario) => scenario.id === selectedScenarioId.value),
)

watch(
  () => [state.messages.length, state.insight, status.busy],
  async () => {
    await nextTick()
    bottom.value?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  },
)

watch(
  () => [state.messages.length, state.draft],
  ([messageCount, draft]) => {
    if (messageCount === 0 && !draft) {
      selectedScenarioId.value = null
    }
  },
)

function chooseScenarioTurn(scenario: ConversationScenario) {
  if (conversationTurn.value > 0 && scenario.id !== selectedScenarioId.value) return
  selectedScenarioId.value = scenario.id
  const text = scenario.turns[conversationTurn.value]
  if (!text) return
  state.draft = text
  input.value?.focus()
}

function onEnter(event: KeyboardEvent) {
  if (!event.shiftKey && !event.isComposing) {
    event.preventDefault()
    void send()
  }
}

async function updateDashboard() {
  await saveInsight()
  await router.push('/dashboard')
}
</script>

<template>
  <div class="chat-wrap">
    <h1 v-if="!state.messages.length" class="page-title">👋 Hi Welcome to EchoTrail!</h1>
    <template v-else>
      <div class="chat-heading">
        <h1 class="page-title">與艾可聊聊</h1>
        <span class="demo-label">Gemini</span>
      </div>
      <div aria-live="polite" class="chat-messages">
        <div
          v-for="(message, index) in state.messages"
          :key="index"
          :class="message.role === 'user' ? 'chat-msg-user' : 'chat-msg-echo'"
        >
          {{ message.text }}
        </div>
        <p v-if="status.busy" class="thinking" role="status">
          {{ state.insight ? '正在更新 Dashboard…' : '艾可整理中…' }}
        </p>
      </div>
      <div v-if="!state.insight" class="insight-btn-wrap">
        <button class="insight-btn" :disabled="status.busy" @click="generateInsight">
          ✨ Generate Insight
        </button>
      </div>
      <EchoCard v-if="state.insight" :event="state.insight">
        <p class="echo-footer">已完成本次 Echo Card，可將 grounded 訊號加入 Dashboard。</p>
        <p class="demo-note">卡片與圖表訊號由後端生成；所有引證已通過逐字稿比對。</p>
        <button class="update-btn" :disabled="status.busy" @click="updateDashboard">
          {{ saved ? '已更新 · 查看 Dashboard' : '更新至 Dashboard' }}
        </button>
      </EchoCard>
    </template>

    <p v-if="status.error" role="alert" class="mb-3 text-sm text-destructive">
      {{ status.error }}
    </p>
    <form class="input-box" @submit.prevent="send">
      <label class="sr-only" for="chat-input">和艾可聊聊</label>
      <textarea
        id="chat-input"
        ref="input"
        v-model="state.draft"
        class="input-text"
        rows="2"
        maxlength="2000"
        placeholder="和我聊聊你的職涯經驗或近期發生的事吧"
        :disabled="status.busy"
        @keydown.enter="onEnter"
      ></textarea>
      <div class="input-controls input-controls-send-only">
        <button
          class="send-btn"
          aria-label="送出訊息"
          :disabled="!state.draft.trim() || status.busy"
        >
          ↑
        </button>
      </div>

      <button
        v-if="
          selectedScenario &&
          conversationTurn > 0 &&
          conversationTurn < selectedScenario.turns.length
        "
        type="button"
        class="scenario-next"
        :disabled="status.busy"
        @click="chooseScenarioTurn(selectedScenario)"
      >
        帶入「{{ selectedScenario.label }}」第 {{ conversationTurn + 1 }} 輪
      </button>
      <p
        v-else-if="selectedScenario && conversationTurn >= selectedScenario.turns.length"
        class="demo-note"
      >
        三輪情境已完成，可以產生洞察。
      </p>
    </form>

    <section v-if="!state.messages.length" aria-labelledby="scenario-title">
      <div class="scenario-heading">
        <h2 id="scenario-title">選一個情境開始</h2>
        <p>每個情境有三輪引導文字，回覆與洞察都由 Gemini 即時產生。</p>
      </div>
      <div class="suggest-row">
        <button
          v-for="scenario in conversationScenarios"
          :key="scenario.id"
          type="button"
          class="suggest-card scenario-card"
          :class="{ active: scenario.id === selectedScenarioId }"
          :aria-pressed="scenario.id === selectedScenarioId"
          :disabled="status.busy"
          @click="chooseScenarioTurn(scenario)"
        >
          <strong>{{ scenario.label }}</strong>
          <span class="sub">{{ scenario.description }}</span>
        </button>
      </div>
    </section>

    <p class="demo-note">Gemini 即時回覆 · Enter 送出，Shift + Enter 換行</p>
    <div ref="bottom"></div>
  </div>
</template>
