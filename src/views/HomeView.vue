<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { useEcho } from '@/composables/useEcho'
import { useDashboard } from '@/composables/useDashboard'
import { useIdentity } from '@/composables/useIdentity'
import { suggestions } from '@/mocks/echo'

const { user } = useIdentity()
const {
  state,
  status,
  confirmedEvent,
  send,
  generateInsight,
  confirmInsight,
  continueConversation,
  editCard,
} = useEcho()
const { rebuild } = useDashboard()
const router = useRouter()
const bottom = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
watch(
  () => [state.messages.length, state.insight, status.busy],
  async () => {
    await nextTick()
    bottom.value?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  },
)
function choose(index: number) {
  state.draft = suggestions[index]?.text ?? ''
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
  status.busy = true
  status.error = ''
  try {
    await rebuild(identity)
    if (user.value?.id === identity) await router.push('/dashboard')
  } catch (caught) {
    if (user.value?.id === identity) {
      const data: unknown = axios.isAxiosError(caught) ? caught.response?.data : null
      status.error =
        data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : 'Dashboard 更新失敗，請重試。'
    }
  } finally {
    if (user.value?.id === identity) status.busy = false
  }
}
</script>
<template>
  <div class="chat-wrap">
    <h1 v-if="!state.messages.length" class="wtitle">👋 Hi Welcome to EchoTrail!</h1>
    <template v-else>
      <div class="chat-heading">
        <h1>與艾可聊聊</h1>
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
          {{ state.insight ? '處理卡片中…' : '艾可整理中…' }}
        </p>
      </div>
      <div v-if="!state.insight" class="insight-btn-wrap">
        <button class="insight-btn" :disabled="status.busy" @click="generateInsight">
          ✨ Generate Insight
        </button>
      </div>
      <EchoCard
        v-if="state.insight"
        :card="state.insight.card"
        :editable="!confirmedEvent && !status.busy"
        label="Echo Card 預覽"
        @edit="editCard"
      >
        <p class="echo-footer">
          {{
            confirmedEvent
              ? '已確認，My Trail 現在可以讀到這張卡片。'
              : '確認後會保存這張卡片，Dashboard 仍需另行更新。'
          }}
        </p>
        <button
          v-if="!confirmedEvent"
          data-test="confirm-card"
          class="update-btn"
          :disabled="status.busy"
          @click="confirmInsight"
        >
          確認 Echo Card
        </button>
        <div v-else class="flex flex-wrap gap-3">
          <button
            data-test="update-dashboard"
            class="update-btn"
            :disabled="status.busy"
            @click="updateDashboard"
          >
            更新至 Dashboard
          </button>
          <button
            data-test="continue-conversation"
            type="button"
            class="toggle-btn"
            :disabled="status.busy"
            @click="continueConversation"
          >
            繼續此對話
          </button>
        </div>
      </EchoCard>
    </template>
    <p v-if="status.error" role="alert" class="mb-3 text-sm text-destructive">{{ status.error }}</p>
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
        :disabled="status.busy || !!state.insight"
        @keydown.enter="onEnter"
      ></textarea>
      <div class="input-controls">
        <button
          type="button"
          class="icon-btn"
          aria-label="帶入聊天靈感"
          :disabled="status.busy || !!state.insight"
          @click="choose(0)"
        >
          ＋
        </button>
        <button
          class="send-btn"
          aria-label="送出訊息"
          :disabled="!state.draft.trim() || status.busy || !!state.insight"
        >
          ↑
        </button>
      </div>
    </form>
    <div v-if="!state.messages.length" class="suggest-row">
      <button
        v-for="(suggestion, index) in suggestions"
        :key="suggestion.title"
        class="suggest-card"
        @click="choose(index)"
      >
        <div class="emoji">{{ suggestion.icon }}</div>
        {{ suggestion.title }}
        <div class="sub">{{ suggestion.subtitle }}</div>
      </button>
    </div>
    <p class="demo-note">Gemini 即時回覆 · Enter 送出，Shift + Enter 換行</p>
    <div ref="bottom"></div>
  </div>
</template>
