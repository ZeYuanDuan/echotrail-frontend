<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EchoCard from '@/components/echo/EchoCard.vue'
import { Button } from '@/components/ui/button'
import { demoConversations, suggestions, type DemoConversation } from '@/mocks/echo'
import { useEcho } from '@/composables/useEcho'
const { state, status, saved, live, toggleLive, send, generateInsight, saveInsight } = useEcho()
const router = useRouter()
const bottom = ref<HTMLElement | null>(null)
const input = ref<HTMLTextAreaElement | null>(null)
const showSources = ref(false)
const sourceNote = ref('')
const selectedDemoId = ref('cross-team-success')
const demoTurn = computed(() => state.messages.filter((message) => message.role === 'user').length)
const selectedDemo = computed(
  () =>
    demoConversations.find((conversation) => conversation.id === selectedDemoId.value) ??
    demoConversations[0]!,
)
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
function chooseDemoTurn(conversation: DemoConversation) {
  if (demoTurn.value > 0 && conversation.id !== selectedDemoId.value) return
  selectedDemoId.value = conversation.id
  const text = conversation.turns[demoTurn.value]
  if (!text) return
  state.draft = text
  sourceNote.value = `已帶入「${conversation.label}」第 ${demoTurn.value + 1} 輪，送出後會取得真實模型回覆。`
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
      訊息會送到 EchoTrail 後端，再由服務端呼叫
      Gemini。測試請使用虛構內容；產卡後可追溯圖表引用的原句。
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
      <div v-if="!state.insight" class="insight-btn-wrap">
        <button class="insight-btn" :disabled="status.busy" @click="generateInsight">
          ✨ Generate Insight
        </button>
      </div>
      <EchoCard v-if="state.insight" :event="state.insight">
        <p class="echo-footer">已完成本次 Echo Card，可將 grounded 訊號加入 Dashboard。</p>
        <p v-if="live" class="demo-note">卡片與圖表訊號由後端生成；所有引證已通過逐字稿比對。</p>
        <p v-else class="demo-note">目前為固定示範內容。</p>
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
      <div v-if="live && demoTurn < selectedDemo.turns.length" class="script-buttons">
        <button
          v-for="conversation in demoConversations"
          :key="conversation.id"
          type="button"
          class="script-btn"
          :class="{ active: conversation.id === selectedDemoId }"
          :aria-pressed="conversation.id === selectedDemoId"
          :disabled="status.busy || (demoTurn > 0 && conversation.id !== selectedDemoId)"
          @click="chooseDemoTurn(conversation)"
        >
          <span>{{ conversation.label }} · 第 {{ demoTurn + 1 }} 輪</span>
          <small>{{ conversation.description }}</small>
        </button>
      </div>
      <p v-else-if="live && demoTurn >= selectedDemo.turns.length" class="demo-note">
        三輪固定腳本已完成，可以產生洞察。
      </p>
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
