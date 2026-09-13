import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { chatLlm } from '@/lib/llm'
import { demoEvent, mockReply, trailEvents, type Message, type TrailEvent } from '@/mocks/echo'

const STORAGE_KEY = 'echotrail-demo-v1'
interface DemoState {
  events: TrailEvent[]
  messages: Message[]
  draft: string
  insight: TrailEvent | null
  sourceId: number | null
}
function initialState(): DemoState {
  return { events: [], messages: [], draft: '', insight: null, sourceId: null }
}
function isEvent(value: unknown): value is TrailEvent {
  if (!value || typeof value !== 'object') return false
  const e = value as Record<string, unknown>
  return (
    typeof e.id === 'number' &&
    Number.isFinite(e.id) &&
    typeof e.quarter === 'number' &&
    ['title', 'date', 'emotion', 'like', 'dislike', 'value', 'quote'].every(
      (key) => typeof e[key] === 'string',
    ) &&
    Array.isArray(e.happen) &&
    e.happen.every((item) => typeof item === 'string')
  )
}
function restore(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return initialState()
    const saved = parsed as Record<string, unknown>
    if (
      !Array.isArray(saved.events) ||
      !saved.events.every(isEvent) ||
      !Array.isArray(saved.messages) ||
      !saved.messages.every(
        (m: unknown): m is Message =>
          !!m &&
          typeof m === 'object' &&
          'role' in m &&
          'text' in m &&
          (m.role === 'user' || m.role === 'echo') &&
          typeof m.text === 'string',
      ) ||
      typeof saved.draft !== 'string' ||
      (saved.insight !== null && !isEvent(saved.insight)) ||
      (saved.sourceId !== null && typeof saved.sourceId !== 'number')
    )
      return initialState()
    return {
      events: saved.events,
      messages: saved.messages,
      draft: saved.draft,
      insight: saved.insight,
      sourceId: saved.sourceId,
    }
  } catch {
    return initialState()
  }
}
const state = reactive<DemoState>(restore())
const live = ref(false)
let mockConversation = {
  messages: state.messages,
  draft: state.draft,
  insight: state.insight,
  sourceId: state.sourceId,
}
let liveConversation = {
  messages: [] as Message[],
  draft: '',
  insight: null as TrailEvent | null,
  sourceId: null as number | null,
}
const status = reactive({ busy: false, storageError: false, error: '' })
function toggleLive() {
  if (status.busy) return
  const current = {
    messages: state.messages,
    draft: state.draft,
    insight: state.insight,
    sourceId: state.sourceId,
  }
  if (live.value) {
    liveConversation = current
    Object.assign(state, mockConversation)
    live.value = false
  } else {
    mockConversation = current
    live.value = true
    Object.assign(state, liveConversation)
  }
  status.error = ''
}
watch(
  state,
  () => {
    if (live.value) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      status.storageError = false
    } catch {
      status.storageError = true
    }
  },
  { deep: true, flush: 'sync' },
)
const allEvents = computed(() =>
  [
    ...trailEvents.filter((e) => !state.events.some((saved) => saved.id === e.id)),
    ...state.events,
  ].sort((a, b) => a.id - b.id),
)
const updated = computed(() => state.events.length > 0)
const saved = computed(
  () =>
    !!state.insight &&
    state.events.some((e) => JSON.stringify(e) === JSON.stringify(state.insight)),
)
const delay = () => new Promise((resolve) => setTimeout(resolve, 450))
function newChat() {
  if (status.busy) return
  status.error = ''
  state.messages = []
  state.draft = ''
  state.insight = null
  state.sourceId = null
}
async function send() {
  const text = state.draft.trim()
  if (!text || status.busy) return
  if (live.value && (text.length > 2000 || state.messages.length >= 32)) {
    status.error = '每則訊息最多 2000 字，每段對話最多 16 輪；請縮短文字或點 ＋ New。'
    return
  }
  status.error = ''
  state.messages.push({ role: 'user', text })
  state.draft = ''
  state.insight = null
  status.busy = true
  if (live.value) {
    try {
      const { text: reply } = await chatLlm(state.messages)
      state.messages.push({ role: 'echo', text: reply })
    } catch (error) {
      state.messages.pop()
      state.draft = text
      const data: unknown = axios.isAxiosError(error) ? error.response?.data : null
      status.error =
        data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : '暫時無法取得回覆，請確認對話服務已啟動，再按送出重試。'
    } finally {
      status.busy = false
    }
    return
  }
  await delay()
  state.messages.push({
    role: 'echo',
    text: mockReply(text, state.messages.filter((m) => m.role === 'user').length),
  })
  status.busy = false
}
async function generateInsight() {
  if (live.value) return
  if (status.busy || !state.messages.some((m) => m.role === 'user') || state.insight) return
  status.busy = true
  await delay()
  const original = allEvents.value.find((e) => e.id === state.sourceId)
  const first = state.messages.find((m) => m.role === 'user')!.text
  state.insight = {
    ...(original ?? demoEvent),
    id: original?.id ?? Math.max(6, ...allEvents.value.map((e) => e.id)) + 1,
    title:
      original?.title ??
      (/工程師|離職/.test(first)
        ? demoEvent.title
        : first.slice(0, 24) + (first.length > 24 ? '…' : '')),
    happen: state.messages.filter((m) => m.role === 'user').map((m) => m.text),
    quote: state.messages.filter((m) => m.role === 'user').slice(-1)[0]!.text,
    isNew: true,
  }
  status.busy = false
}
async function saveInsight() {
  if (!state.insight || status.busy || saved.value) return
  status.busy = true
  await delay()
  state.events = [...state.events.filter((e) => e.id !== state.insight!.id), { ...state.insight }]
  state.sourceId = state.insight.id
  status.busy = false
}
function discuss(event: TrailEvent) {
  if (status.busy) return
  if (live.value) toggleLive()
  newChat()
  state.sourceId = event.id
  state.messages = [
    { role: 'user', text: event.quote },
    {
      role: 'echo',
      text: `我們上次聊到了「${event.title}」。回頭看這件事，你現在有什麼新的感受或想法？`,
    },
  ]
}
function reset() {
  if (!status.busy) {
    if (live.value) toggleLive()
    liveConversation = { messages: [], draft: '', insight: null, sourceId: null }
    status.error = ''
    Object.assign(state, initialState())
  }
}
export function useEcho() {
  return {
    state,
    live,
    toggleLive,
    status,
    allEvents,
    updated,
    saved,
    newChat,
    send,
    generateInsight,
    saveInsight,
    discuss,
    reset,
  }
}
