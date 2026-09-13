<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { Button } from '@/components/ui/button'
import { suggestions } from '@/mocks/echo'
import { useEcho } from '@/composables/useEcho'
const { state, status, saved, live, toggleLive, send, generateInsight, saveInsight } = useEcho()
const router = useRouter()
const bottom = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const showSources = ref(false)
const sourceNote = ref('')
watch(
  () => [state.messages.length, state.insight, status.busy],
  async () => {
    await nextTick()
    bottom.value?.scrollIntoView?.({ behavior: 'smooth', block: 'end' })
  },
)
function choose(index: number) {
  state.draft = suggestions[index]!.text
  sourceNote.value = '已帶入示範文字，可替換成你想聊的內容。'
  showSources.value = false
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
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
      <span class="text-sm text-muted-foreground" role="status">{{
        live ? 'Gemini 即時對話' : '假資料體驗'
      }}</span>
      <Button
        type="button"
        variant="outline"
        :aria-pressed="live"
        :disabled="status.busy"
        @click="toggleLive"
      >
        {{ live ? '切回假資料' : '切換 Gemini 對話' }}
      </Button>
    </div>
    <p v-if="live" class="mb-4 text-sm text-muted-foreground">
      訊息會傳送至 Gemini，測試請使用虛構內容。對話僅保留於本次開啟期間；Echo Card 與 Dashboard
      尚未串接 AI。
    </p>
    <h1 v-if="!state.messages.length" class="wtitle">👋 Hi Welcome to EchoTrail!</h1>
    <template v-else>
      <div class="chat-heading">
        <h1>與艾可聊聊</h1>
        <span class="demo-label">{{ live ? 'Gemini' : '模擬對話' }}</span>
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
      <div v-if="!live && !state.insight" class="insight-btn-wrap">
        <button class="insight-btn" :disabled="status.busy" @click="generateInsight">
          ✨ Generate Insight
        </button>
      </div>
      <EchoCard v-if="state.insight" :event="state.insight">
        <p class="echo-footer">
          已完成本次 Echo Card。這次的方向與過去在意的價值標準部分符合，也有新的訊號值得留意。
        </p>
        <p class="demo-note">分析欄位為固定示範內容；事件描述與引證原話保留你的輸入。</p>
        <button class="update-btn" :disabled="status.busy" @click="updateDashboard">
          {{ saved ? '已更新 · 查看 Dashboard' : '更新至 Dashboard' }}
        </button>
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
        :maxlength="live ? 2000 : undefined"
        placeholder="和我聊聊你的職涯經驗或近期發生的事吧"
        :disabled="status.busy"
        @keydown.enter="onEnter"
      ></textarea>
      <div class="input-controls">
        <button
          type="button"
          class="icon-btn"
          aria-label="加入示範內容"
          :aria-expanded="showSources"
          :disabled="status.busy"
          @click="showSources = !showSources"
        >
          ＋
        </button>
        <div class="icon-group">
          <button
            type="button"
            class="icon-btn"
            aria-label="帶入聊天靈感"
            :disabled="status.busy"
            @click="choose(2)"
          >
            💬</button
          ><button
            class="send-btn"
            aria-label="送出訊息"
            :disabled="!state.draft.trim() || status.busy"
          >
            ↑
          </button>
        </div>
      </div>
      <div v-if="showSources" class="source-menu">
        <button
          v-for="(suggestion, i) in suggestions"
          :key="suggestion.title"
          type="button"
          @click="choose(i)"
        >
          {{ suggestion.icon }} {{ suggestion.title }}示範
        </button>
      </div>
      <p v-if="sourceNote" class="demo-note" role="status">{{ sourceNote }}</p>
    </form>
    <div v-if="!state.messages.length" class="suggest-row">
      <button
        v-for="(suggestion, i) in suggestions"
        :key="suggestion.title"
        class="suggest-card"
        @click="choose(i)"
      >
        <div class="emoji">{{ suggestion.icon }}</div>
        {{ suggestion.title }}
        <div class="sub">{{ suggestion.subtitle }}</div>
      </button>
    </div>
    <p class="demo-note">
      {{ live ? 'Gemini 即時回覆' : '假資料體驗 · 不需登入' }} · Enter 送出，Shift + Enter 換行
    </p>
    <div ref="bottom"></div>
  </div>
</template>
