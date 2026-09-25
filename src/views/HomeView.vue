<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { conversationScenarios, type ConversationScenario } from '@/data/conversation-scenarios'
import { MAX_MESSAGE_LENGTH, useEcho } from '@/composables/useEcho'

const {
  state,
  status,
  dashboardReady,
  send,
  generateInsight,
  updateDashboard: refreshDashboard,
} = useEcho()
const router = useRouter()
const bottom = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const scenarioStarted = ref(false)
const conversationTurn = computed(
  () => state.messages.filter((message) => message.role === 'user').length,
)
const scenarioTurnCount = computed(() => conversationScenarios[0]?.turns.length ?? 0)

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
      scenarioStarted.value = false
    }
  },
)

function chooseScenarioTurn(scenario: ConversationScenario) {
  const text = scenario.turns[conversationTurn.value]
  if (!text) return
  scenarioStarted.value = true
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
  if (dashboardReady.value || (await refreshDashboard())) {
    await router.push('/dashboard')
  }
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
        <p class="echo-footer">
          已生成暫存 Echo Card，您仍可以繼續對話，或儲存事件並重新產生 Dashboard。
        </p>
        <p class="demo-note">
          繼續對話會清除這張預覽；按下更新後，才會儲存事件並重新產生 Dashboard。
        </p>
        <button class="update-btn" :disabled="status.busy" @click="updateDashboard">
          {{ dashboardReady ? '已更新 · 查看 Dashboard' : '更新至 Dashboard' }}
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
        :maxlength="MAX_MESSAGE_LENGTH"
        placeholder="和我聊聊你的職涯經驗或近期發生的事吧"
        :disabled="status.busy"
        @keydown.enter="onEnter"
      ></textarea>
      <p class="text-right text-xs text-muted-foreground" aria-live="polite">
        {{ state.draft.length }} / {{ MAX_MESSAGE_LENGTH }}
      </p>
      <div class="input-controls input-controls-send-only">
        <button
          class="send-btn"
          aria-label="送出訊息"
          :disabled="!state.draft.trim() || status.busy"
        >
          ↑
        </button>
      </div>

      <p v-if="scenarioStarted && conversationTurn >= scenarioTurnCount" class="demo-note">
        三輪情境已完成，可以產生洞察。
      </p>
    </form>

    <section
      v-if="scenarioStarted && conversationTurn > 0 && conversationTurn < scenarioTurnCount"
      aria-labelledby="scenario-next-title"
    >
      <div class="scenario-heading">
        <h2 id="scenario-next-title">選擇第 {{ conversationTurn + 1 }} 輪腳本</h2>
        <p>可以自由選擇任一情境，不必延續上一輪的腳本。</p>
      </div>
      <div class="suggest-row">
        <button
          v-for="scenario in conversationScenarios"
          :key="`${scenario.id}-${conversationTurn}`"
          type="button"
          class="suggest-card scenario-card"
          :disabled="status.busy"
          @click="chooseScenarioTurn(scenario)"
        >
          <strong>{{ scenario.label }}</strong>
          <span class="sub">第 {{ conversationTurn + 1 }} 輪 · {{ scenario.description }}</span>
        </button>
      </div>
    </section>

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
