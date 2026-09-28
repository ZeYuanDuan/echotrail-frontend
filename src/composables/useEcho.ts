import { reactive, ref, watch } from 'vue'
import axios from 'axios'
import { chatLlm, generateInsightLlm, type InsightResponse } from '@/lib/llm'
import {
  saveEvent,
  type CardFields,
  type ConfirmEventInput,
  type EditedField,
  type EventRecord,
} from '@/lib/persistence'
import { useIdentity } from '@/composables/useIdentity'
import type { Message } from '@/types/echo'

export const MAX_MESSAGE_LENGTH = 800

const { user } = useIdentity()
const state = reactive<{ messages: Message[]; draft: string; insight: InsightResponse | null }>({
  messages: [],
  draft: '',
  insight: null,
})
const status = reactive({ busy: false, error: '' })
const conversationId = ref<string>(crypto.randomUUID())
const segmentStartIndex = ref(0)
const clientEventId = ref<string | null>(null)
const confirmedEvent = ref<EventRecord | null>(null)
const pendingSavePayload = ref<ConfirmEventInput | null>(null)
const editedFields = ref<EditedField[]>([])
let requestGeneration = 0
let changingDraftOwner = false

const DRAFT_KEY_PREFIX = 'echotrail-conversation-draft-v1:'
type ConversationDraft = {
  version: 1
  userId: string
  conversationId: string
  messages: Message[]
  draft: string
  segmentStartIndex: number
}

function draftKey(userId: string): string {
  return `${DRAFT_KEY_PREFIX}${userId}`
}

function removeDraft(userId = user.value?.id): void {
  if (!userId) return
  try {
    localStorage.removeItem(draftKey(userId))
  } catch {
    // The conversation remains usable when browser storage is unavailable.
  }
}

function isMessage(value: unknown): value is Message {
  return (
    !!value &&
    typeof value === 'object' &&
    'role' in value &&
    (value.role === 'user' || value.role === 'echo') &&
    'text' in value &&
    typeof value.text === 'string'
  )
}

function isConversationDraft(value: unknown, userId: string): value is ConversationDraft {
  if (!value || typeof value !== 'object') return false
  const saved = value as Partial<ConversationDraft>
  return (
    saved.version === 1 &&
    saved.userId === userId &&
    typeof saved.conversationId === 'string' &&
    saved.conversationId.length > 0 &&
    Array.isArray(saved.messages) &&
    saved.messages.every(isMessage) &&
    typeof saved.draft === 'string' &&
    saved.draft.length <= MAX_MESSAGE_LENGTH &&
    Number.isInteger(saved.segmentStartIndex) &&
    saved.segmentStartIndex! >= 0 &&
    saved.segmentStartIndex! <= saved.messages.length
  )
}

function persistDraft(): void {
  const userId = user.value?.id
  if (!userId || changingDraftOwner || status.busy) return
  const hasUnfinishedSegment =
    state.draft.length > 0 || state.messages.length > segmentStartIndex.value
  if (confirmedEvent.value || !hasUnfinishedSegment) {
    removeDraft(userId)
    return
  }
  const saved: ConversationDraft = {
    version: 1,
    userId,
    conversationId: conversationId.value,
    messages: state.messages.map((message) => ({ ...message })),
    draft: state.draft,
    segmentStartIndex: segmentStartIndex.value,
  }
  try {
    localStorage.setItem(draftKey(userId), JSON.stringify(saved))
  } catch {
    // The conversation remains usable when browser storage is unavailable.
  }
}

function restoreDraft(userId: string): void {
  try {
    const raw = localStorage.getItem(draftKey(userId))
    if (!raw) return
    const saved: unknown = JSON.parse(raw)
    if (!isConversationDraft(saved, userId)) {
      removeDraft(userId)
      return
    }
    state.messages = saved.messages.map((message) => ({ ...message }))
    state.draft = saved.draft
    conversationId.value = saved.conversationId
    segmentStartIndex.value = saved.segmentStartIndex
  } catch {
    removeDraft(userId)
  }
}

function resetMemory(): void {
  requestGeneration++
  state.messages = []
  state.draft = ''
  state.insight = null
  status.busy = false
  status.error = ''
  conversationId.value = crypto.randomUUID()
  segmentStartIndex.value = 0
  clientEventId.value = null
  confirmedEvent.value = null
  pendingSavePayload.value = null
  editedFields.value = []
}

function reset(): void {
  changingDraftOwner = true
  removeDraft()
  resetMemory()
  changingDraftOwner = false
}
watch(
  () => user.value?.id,
  (userId) => {
    changingDraftOwner = true
    resetMemory()
    if (userId) restoreDraft(userId)
    changingDraftOwner = false
  },
  { flush: 'sync' },
)
watch(
  [
    () => state.messages,
    () => state.draft,
    () => state.insight,
    () => status.busy,
    () => segmentStartIndex.value,
    () => confirmedEvent.value,
  ],
  persistDraft,
  { deep: true, flush: 'sync' },
)
function newChat(): void {
  if (!status.busy) reset()
}
function continueConversation(): void {
  if (status.busy || !confirmedEvent.value) return
  segmentStartIndex.value = state.messages.length
  state.insight = null
  confirmedEvent.value = null
  clientEventId.value = null
  pendingSavePayload.value = null
  editedFields.value = []
  status.error = ''
}
function editCard(field: EditedField, value: string): void {
  if (!state.insight || confirmedEvent.value || pendingSavePayload.value) return
  if (field === 'happen')
    state.insight.card.happen = value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  else state.insight.card[field] = value
  if (!editedFields.value.includes(field)) editedFields.value.push(field)
}
function errorMessage(caught: unknown, fallback: string): string {
  const data: unknown = axios.isAxiosError(caught) ? caught.response?.data : null
  return data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
    ? data.error
    : fallback
}
async function send(): Promise<void> {
  const text = state.draft.trim()
  if (!user.value || !text || status.busy || confirmedEvent.value) return
  if (text.length > MAX_MESSAGE_LENGTH || state.messages.length - segmentStartIndex.value >= 30) {
    status.error = '本張卡片的對話已達長度限制，請先產生洞察或點 ＋ New。'
    return
  }
  const identity = user.value.id
  const generation = requestGeneration
  const previousInsight = state.insight
  const previousClientEventId = clientEventId.value
  const previousPendingSavePayload = pendingSavePayload.value
  const previousEditedFields = [...editedFields.value]
  status.error = ''
  status.busy = true
  state.messages.push({ role: 'user', text })
  state.draft = ''
  state.insight = null
  clientEventId.value = null
  pendingSavePayload.value = null
  editedFields.value = []
  try {
    const { text: reply } = await chatLlm(state.messages.slice(-31))
    if (identity === user.value?.id && generation === requestGeneration)
      state.messages.push({ role: 'echo', text: reply })
  } catch (caught) {
    if (identity === user.value?.id && generation === requestGeneration) {
      state.messages.pop()
      state.draft = text
      state.insight = previousInsight
      clientEventId.value = previousClientEventId
      pendingSavePayload.value = previousPendingSavePayload
      editedFields.value = previousEditedFields
      status.error = errorMessage(caught, '暫時無法取得回覆，請重試。')
    }
  } finally {
    if (identity === user.value?.id && generation === requestGeneration) status.busy = false
  }
}
async function generateInsight(): Promise<void> {
  const segment = state.messages.slice(segmentStartIndex.value)
  if (
    !user.value ||
    status.busy ||
    state.insight ||
    segment.length < 2 ||
    segment[segment.length - 1]?.role !== 'echo'
  )
    return
  const identity = user.value.id
  const generation = requestGeneration
  status.busy = true
  status.error = ''
  try {
    const insight = await generateInsightLlm(segment)
    if (identity === user.value?.id && generation === requestGeneration) {
      state.insight = insight
      clientEventId.value = crypto.randomUUID()
      editedFields.value = []
    }
  } catch (caught) {
    if (identity === user.value?.id && generation === requestGeneration)
      status.error = errorMessage(caught, '暫時無法產生洞察，請重試。')
  } finally {
    if (identity === user.value?.id && generation === requestGeneration) status.busy = false
  }
}
async function confirmInsight(): Promise<EventRecord | null> {
  if (!user.value || !state.insight || !clientEventId.value || status.busy || confirmedEvent.value)
    return null
  const identity = user.value.id
  const generation = requestGeneration
  status.busy = true
  status.error = ''
  const payload = pendingSavePayload.value ?? {
    userId: identity,
    clientEventId: clientEventId.value,
    conversationId: conversationId.value,
    messages: state.messages.slice(segmentStartIndex.value).map(({ role, text }) => ({
      role: role === 'echo' ? ('model' as const) : ('user' as const),
      text,
    })),
    card: { ...state.insight.card, happen: [...state.insight.card.happen] } as CardFields,
    editedFields: [...editedFields.value],
    signals: state.insight.signals.map((signal) => ({ ...signal })),
  }
  pendingSavePayload.value = payload
  try {
    const result = await saveEvent(payload)
    if (identity === user.value?.id && generation === requestGeneration) {
      confirmedEvent.value = result
      return result
    }
  } catch (caught) {
    if (identity === user.value?.id && generation === requestGeneration) {
      if (axios.isAxiosError(caught) && caught.response?.status === 400)
        pendingSavePayload.value = null
      status.error = errorMessage(caught, '暫時無法儲存卡片，請重試。')
    }
  } finally {
    if (identity === user.value?.id && generation === requestGeneration) status.busy = false
  }
  return null
}
export function useEcho() {
  return {
    state,
    status,
    conversationId,
    segmentStartIndex,
    clientEventId,
    confirmedEvent,
    pendingSavePayload,
    editedFields,
    newChat,
    continueConversation,
    editCard,
    send,
    generateInsight,
    confirmInsight,
    reset,
  }
}
