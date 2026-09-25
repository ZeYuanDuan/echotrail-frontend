import { computed, reactive, watch } from 'vue'
import axios from 'axios'
import { chatLlm, generateInsightLlm } from '@/lib/llm'
import type { DashboardProfile, Message, TrailEvent } from '@/types/echo'

const STORAGE_KEY = 'echotrail-v1'
const LEGACY_STORAGE_KEY = 'echotrail-demo-v1'
export const MAX_MESSAGE_LENGTH = 800
const MAX_MESSAGE_COUNT = 31
const MAX_CONVERSATION_LENGTH = 16_000

interface EchoState {
  events: TrailEvent[]
  messages: Message[]
  draft: string
  insight: TrailEvent | null
  sourceId: number | null
}

function initialState(): EchoState {
  return { events: [], messages: [], draft: '', insight: null, sourceId: null }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isDashboardProfile(value: unknown): value is DashboardProfile {
  if (!value || typeof value !== 'object') return false
  const profile = value as Record<string, unknown>
  const persona = profile.persona as Record<string, unknown> | undefined
  const anchor = profile.anchor as Record<string, unknown> | undefined
  const northStar = profile.northStar as Record<string, unknown> | undefined

  return (
    !!persona &&
    typeof persona.headline === 'string' &&
    isStringArray(persona.summaries) &&
    typeof persona.quote === 'string' &&
    !!anchor &&
    typeof anchor.primary === 'string' &&
    isStringArray(anchor.ability) &&
    isStringArray(anchor.motivation) &&
    isStringArray(anchor.values) &&
    Array.isArray(profile.keywords) &&
    profile.keywords.every(
      (keyword) =>
        !!keyword &&
        typeof keyword === 'object' &&
        typeof (keyword as Record<string, unknown>).text === 'string' &&
        typeof (keyword as Record<string, unknown>).weight === 'number',
    ) &&
    Array.isArray(profile.patterns) &&
    profile.patterns.every(
      (pattern) =>
        !!pattern &&
        typeof pattern === 'object' &&
        typeof (pattern as Record<string, unknown>).title === 'string' &&
        typeof (pattern as Record<string, unknown>).evidenceQuote === 'string',
    ) &&
    !!northStar &&
    typeof northStar.primaryAnchor === 'string' &&
    typeof northStar.tagline === 'string' &&
    isStringArray(northStar.desires) &&
    typeof northStar.bottomLine === 'string' &&
    isStringArray(northStar.nextSteps)
  )
}

function isEvent(value: unknown): value is TrailEvent {
  if (!value || typeof value !== 'object') return false
  const event = value as Record<string, unknown>
  return (
    typeof event.id === 'number' &&
    Number.isFinite(event.id) &&
    typeof event.quarter === 'number' &&
    ['title', 'date', 'emotion', 'like', 'dislike', 'value', 'quote'].every(
      (key) => typeof event[key] === 'string',
    ) &&
    isStringArray(event.happen) &&
    Array.isArray(event.signals) &&
    event.signals.every(
      (signal) =>
        !!signal &&
        typeof signal === 'object' &&
        ['riasec', 'disc', 'schein'].includes(
          String((signal as Record<string, unknown>).framework),
        ) &&
        typeof (signal as Record<string, unknown>).dimension === 'string' &&
        typeof (signal as Record<string, unknown>).strength === 'number' &&
        typeof (signal as Record<string, unknown>).evidenceQuote === 'string',
    ) &&
    isDashboardProfile(event.dashboard)
  )
}

function restore(): EchoState {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
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
        (message: unknown): message is Message =>
          !!message &&
          typeof message === 'object' &&
          'role' in message &&
          'text' in message &&
          (message.role === 'user' || message.role === 'echo') &&
          typeof message.text === 'string',
      ) ||
      typeof saved.draft !== 'string' ||
      (saved.insight !== null && !isEvent(saved.insight)) ||
      (saved.sourceId !== null && typeof saved.sourceId !== 'number')
    ) {
      return initialState()
    }

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

const state = reactive<EchoState>(restore())
const status = reactive({ busy: false, storageError: false, error: '' })

watch(
  state,
  () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      status.storageError = false
    } catch {
      status.storageError = true
    }
  },
  { deep: true, flush: 'sync' },
)

const allEvents = computed(() => [...state.events].sort((a, b) => a.id - b.id))
const saved = computed(
  () =>
    !!state.insight &&
    state.events.some((event) => JSON.stringify(event) === JSON.stringify(state.insight)),
)
const nextEventId = () => Math.max(0, ...state.events.map((event) => event.id)) + 1

function newChat() {
  if (status.busy) return
  status.error = ''
  state.messages = []
  state.draft = ''
  state.insight = null
  state.sourceId = null
}

function markEventViewed(id: number) {
  const event = state.events.find((item) => item.id === id)
  if (!event?.isNew) return

  event.isNew = false
  if (state.insight?.id === id) state.insight.isNew = false
}

async function send() {
  const text = state.draft.trim()
  if (!text || status.busy) return
  const conversationLength = state.messages.reduce(
    (sum, message) => sum + message.text.length,
    text.length,
  )
  if (
    text.length > MAX_MESSAGE_LENGTH ||
    state.messages.length >= MAX_MESSAGE_COUNT ||
    conversationLength > MAX_CONVERSATION_LENGTH
  ) {
    status.error =
      '每則訊息最多 800 字、每段對話最多 31 則且總長最多 16,000 字；請縮短文字或點 ＋ New。'
    return
  }

  status.error = ''
  const previousInsight = state.insight
  state.messages.push({ role: 'user', text })
  state.draft = ''
  state.insight = null
  status.busy = true
  try {
    const { text: reply } = await chatLlm([...state.messages])
    state.messages.push({ role: 'echo', text: reply })
  } catch (error) {
    state.messages.pop()
    state.draft = text
    state.insight = previousInsight
    const data: unknown = axios.isAxiosError(error) ? error.response?.data : null
    status.error =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : '暫時無法取得回覆，請確認對話服務已啟動，再按送出重試。'
  } finally {
    status.busy = false
  }
}

async function generateInsight() {
  if (status.busy || !state.messages.some((message) => message.role === 'user') || state.insight)
    return

  status.error = ''
  status.busy = true
  try {
    const result = await generateInsightLlm([...state.messages])
    const now = new Date()
    state.insight = {
      id: state.sourceId ?? nextEventId(),
      date: new Intl.DateTimeFormat('zh-TW', { month: 'numeric', day: 'numeric' }).format(now),
      quarter: Math.floor(now.getMonth() / 3) + 1,
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
}

async function saveInsight() {
  if (!state.insight || status.busy || saved.value) return
  state.events = [
    ...state.events.filter((event) => event.id !== state.insight!.id),
    { ...state.insight },
  ]
  state.sourceId = state.insight.id
}

function reset() {
  if (status.busy) return
  status.error = ''
  Object.assign(state, initialState())
  try {
    localStorage.removeItem(STORAGE_KEY)
    status.storageError = false
  } catch {
    status.storageError = true
  }
}

export function useEcho() {
  return {
    state,
    status,
    allEvents,
    saved,
    newChat,
    markEventViewed,
    send,
    generateInsight,
    saveInsight,
    reset,
  }
}
