<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { MAX_MESSAGE_LENGTH, useEcho } from '@/composables/useEcho'
import { useDashboard } from '@/composables/useDashboard'
import { useIdentity } from '@/composables/useIdentity'
import { conversationScenarios, type ConversationScenario } from '@/data/conversation-scenarios'

const { user } = useIdentity()
const { state, status, confirmedEvent, newChat, send, generateInsight, confirmInsight, editCard } =
  useEcho()
const { rebuild } = useDashboard()
const router = useRouter()
const bottom = ref<HTMLElement | null>(null)
const insightPreview = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const scenarioStarted = ref(false)
const confirmationStep = ref<'idle' | 'saving' | 'dashboard'>('idle')
const dashboardUpdateFailed = ref(false)
const dashboardUpdateSucceeded = ref(false)
let confirmationGeneration = 0
const conversationTurn = computed(
  () => state.messages.filter((message) => message.role === 'user').length,
)
const scenarioTurnCount = computed(() => conversationScenarios[0]?.turns.length ?? 0)
watch(
  () => state.messages.length,
  async () => {
    await nextTick()
    bottom.value?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  },
)
watch(
  () => state.insight,
  async (insight, previousInsight) => {
    if (!insight || previousInsight) return
    await nextTick()
    insightPreview.value?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  },
)
watch(
  () => [state.messages.length, state.draft],
  ([messageCount, draft]) => {
    if (messageCount === 0 && !draft) scenarioStarted.value = false
  },
)
watch(
  () => user.value?.id,
  () => {
    confirmationGeneration++
    confirmationStep.value = 'idle'
    dashboardUpdateFailed.value = false
    dashboardUpdateSucceeded.value = false
  },
  { flush: 'sync' },
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
  const identity = user.value?.id
  if (!identity || !confirmedEvent.value || status.busy) return
  dashboardUpdateFailed.value = false
  dashboardUpdateSucceeded.value = false
  status.busy = true
  status.error = ''
  try {
    await rebuild(identity)
    if (user.value?.id === identity) {
      dashboardUpdateSucceeded.value = true
      await router.push('/dashboard')
    }
  } catch {
    if (user.value?.id === identity) {
      dashboardUpdateSucceeded.value = false
      dashboardUpdateFailed.value = true
    }
  } finally {
    if (user.value?.id === identity) status.busy = false
  }
}
async function confirmAndUpdateDashboard() {
  const identity = user.value?.id
  if (!identity || status.busy || confirmedEvent.value) return
  const generation = ++confirmationGeneration
  confirmationStep.value = 'saving'
  try {
    const event = await confirmInsight()
    if (!event || user.value?.id !== identity || generation !== confirmationGeneration) return
    confirmationStep.value = 'dashboard'
    await updateDashboard()
  } finally {
    if (generation === confirmationGeneration) confirmationStep.value = 'idle'
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
        <p v-if="status.busy && confirmationStep === 'idle'" class="thinking" role="status">
          {{ state.insight ? '處理卡片中…' : '艾可整理中…' }}
        </p>
      </div>
      <div v-if="!state.insight" class="insight-btn-wrap">
        <button class="insight-btn" :disabled="status.busy" @click="generateInsight">
          ✨ Generate Insight
        </button>
      </div>
      <div
        v-if="state.insight"
        ref="insightPreview"
        class="echo-card-anchor"
        data-test="echo-card-preview"
      >
        <EchoCard
          :card="state.insight.card"
          :editable="!confirmedEvent && !status.busy"
          label="Echo Card 預覽"
          @edit="editCard"
        >
          <p
            v-if="!confirmedEvent || dashboardUpdateFailed || dashboardUpdateSucceeded"
            class="echo-footer"
          >
            {{
              confirmedEvent
                ? dashboardUpdateFailed
                  ? '更新失敗，請在這裡重試。'
                  : dashboardUpdateSucceeded
                    ? '事件已保存。'
                    : ''
                : '確認後會保存為事件，並自動更新 Dashboard。'
            }}
          </p>
          <div
            v-if="!confirmedEvent || confirmationStep !== 'idle'"
            class="dashboard-update-actions"
          >
            <button
              data-test="confirm-card"
              class="update-btn"
              :disabled="status.busy"
              @click="confirmAndUpdateDashboard"
            >
              {{ confirmationStep === 'idle' ? '確認 Echo Card' : '處理中…' }}
            </button>
            <p v-if="confirmationStep !== 'idle'" class="dashboard-update-status" role="status">
              {{ confirmationStep === 'saving' ? '正在儲存事件' : '正在更新 Dashboard'
              }}<span class="loading-dots" aria-hidden="true"
                ><span>.</span><span>.</span><span>.</span></span
              >
            </p>
          </div>
          <div v-else class="flex flex-wrap gap-3">
            <button
              v-if="dashboardUpdateFailed"
              data-test="update-dashboard"
              class="update-btn"
              :disabled="status.busy"
              @click="updateDashboard"
            >
              重試更新 Dashboard
            </button>
            <button
              data-test="new-conversation"
              type="button"
              class="toggle-btn"
              :disabled="status.busy"
              @click="newChat"
            >
              開啟新對話
            </button>
          </div>
        </EchoCard>
      </div>
    </template>
    <p v-if="status.error" role="alert" class="mb-3 text-sm text-destructive">{{ status.error }}</p>
    <form v-if="!confirmedEvent" class="input-box" @submit.prevent="send">
      <label class="sr-only" for="chat-input">和艾可聊聊</label>
      <textarea
        id="chat-input"
        ref="input"
        v-model="state.draft"
        class="input-text"
        rows="2"
        :maxlength="MAX_MESSAGE_LENGTH"
        placeholder="和我聊聊你的職涯經驗或近期發生的事吧"
        :disabled="status.busy || !!confirmedEvent"
        @keydown.enter="onEnter"
      ></textarea>
      <p class="text-right text-xs text-muted-foreground" aria-live="polite">
        {{ state.draft.length }} / {{ MAX_MESSAGE_LENGTH }}
      </p>
      <div class="input-controls input-controls-send-only">
        <button
          class="send-btn"
          aria-label="送出訊息"
          :disabled="!state.draft.trim() || status.busy || !!confirmedEvent"
        >
          ↑
        </button>
      </div>
      <p v-if="scenarioStarted && conversationTurn >= scenarioTurnCount" class="demo-note">
        三輪情境已完成，可以產生洞察。
      </p>
    </form>
    <section
      v-if="
        !confirmedEvent &&
        scenarioStarted &&
        conversationTurn > 0 &&
        conversationTurn < scenarioTurnCount
      "
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
          :disabled="!!confirmedEvent"
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
