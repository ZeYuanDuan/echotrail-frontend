import { computed, reactive, ref, watch } from 'vue'
import axios from 'axios'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
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
    e.happen.every((item) => typeof item === 'string') &&
    (e.signals === undefined ||
      (Array.isArray(e.signals) &&
        e.signals.every(
          (signal) =>
            !!signal &&
            typeof signal === 'object' &&
            ['riasec', 'disc', 'schein'].includes(String(signal.framework)) &&
            typeof signal.dimension === 'string' &&
            typeof signal.strength === 'number' &&
            typeof signal.evidenceQuote === 'string',
        )))
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
    const idMap = new Map(saved.events.map((event, index) => [event.id, index + 1]))
    const events = saved.events.map((event, index) => ({ ...event, id: index + 1 }))
    const insight = saved.insight
      ? { ...saved.insight, id: idMap.get(saved.insight.id) ?? events.length + 1 }
      : null
    return {
      events,
      messages: saved.messages,
      draft: saved.draft,
      insight,
      sourceId: saved.sourceId === null ? null : (idMap.get(saved.sourceId) ?? null),
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
const nextEventId = () => Math.max(0, ...state.events.map((event) => event.id)) + 1
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
  if (status.busy || !state.messages.some((m) => m.role === 'user') || state.insight) return
  status.error = ''
  status.busy = true
  if (live.value) {
    try {
      const result = await generateInsightLlm(state.messages)
      state.insight = {
        id: nextEventId(),
        date: new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(
          new Date(),
        ),
        quarter: Math.floor(new Date().getMonth() / 3) + 1,
        ...result.card,
        signals: result.signals,
        dashboard: result.dashboard,
        isNew: true,
      }
    } catch (error) {
      const data: unknown = axios.isAxiosError(error) ? error.response?.data : null
      status.error =
        data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
          ? data.error
          : '暫時無法產生洞察，請保留對話後再試一次。'
    } finally {
      status.busy = false
    }
    return
  }
  await delay()
  const original = allEvents.value.find((e) => e.id === state.sourceId)
  const first = state.messages.find((m) => m.role === 'user')!.text
  const quote = state.messages.filter((m) => m.role === 'user').slice(-1)[0]!.text
  state.insight = {
    ...(original ?? demoEvent),
    id: original?.id ?? nextEventId(),
    title:
      original?.title ??
      (/工程師|離職/.test(first)
        ? demoEvent.title
        : first.slice(0, 24) + (first.length > 24 ? '…' : '')),
    happen: state.messages.filter((m) => m.role === 'user').map((m) => m.text),
    quote,
    signals: [
      { framework: 'riasec', dimension: 'I', strength: 8, evidenceQuote: quote },
      { framework: 'disc', dimension: 'C', strength: 7, evidenceQuote: quote },
      { framework: 'schein', dimension: 'technical', strength: 8, evidenceQuote: quote },
    ],
    dashboard: {
      persona: {
        headline: '重視釐清問題、用方法做職涯判斷的實踐者',
        summaries: ['會主動整理混亂資訊', '在意成長是否有具體支撐', '傾向用證據取代恐慌'],
        quote,
      },
      anchor: {
        primary: '專家達人',
        ability: ['拆解問題', '整理資訊', '建立判斷方法'],
        motivation: ['持續成長', '做有意義的事', '看見實質成果'],
        values: ['具體證據', '自主判斷', '不被恐慌推著走'],
      },
      keywords: [
        { text: '成長', weight: 5 },
        { text: '方法', weight: 4 },
        { text: '判斷', weight: 4 },
        { text: '環境', weight: 3 },
        { text: '改變', weight: 2 },
      ],
      patterns: [
        { title: '遇到不確定時，會先尋找可驗證的方法', evidenceQuote: quote },
        { title: '會把情緒重新整理成下一步問題', evidenceQuote: quote },
      ],
      northStar: {
        primaryAnchor: '專家達人',
        tagline: '靠專業判斷看清方向，也讓成長有具體依據',
        desires: ['累積可被驗證的專業能力', '在工作中持續解決真正的問題'],
        bottomLine: '不在缺乏成長空間、只能靠恐慌做決定的環境裡硬撐。',
        nextSteps: ['把判斷方法帶進更早期的規劃', '持續記錄能代表專業成長的事件'],
      },
    },
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
