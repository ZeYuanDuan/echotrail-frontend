import { api } from './api'
import type { DashboardProfile, InsightSignal } from '@/types/echo'

export type User = { id: string; name: string }
export type CardFields = {
  title: string
  happen: string[]
  emotion: string
  like: string
  dislike: string
  value: string
  quote: string
}
export type EditedField = 'title' | 'happen' | 'emotion' | 'like' | 'dislike' | 'value' | 'quote'
export type ConfirmEventInput = {
  userId: string
  clientEventId: string
  conversationId: string
  messages: Array<{ role: 'user' | 'model'; text: string }>
  card: CardFields
  editedFields: EditedField[]
  signals: InsightSignal[]
}
export type EventRecord = {
  id: string
  userId: string
  conversationId: string
  messageStartSeq: number
  messageEndSeq: number
  createdAt: string
  source: string
  card: CardFields
  signals: InsightSignal[]
}
export type DashboardSnapshot = {
  id: number
  userId: string
  createdAt: string
  sourceRevision: number
  sourceEventCount: number
  profile: DashboardProfile
  frameworks: {
    scoreVersion?: number
    scores: Record<'riasec' | 'disc' | 'schein', Record<string, number>>
    evidence: Array<{
      eventId: string
      eventTitle: string
      framework: string
      dimension: string
      strength: number
      evidenceQuote: string
    }>
  }
}
export async function resolveUser(name: string): Promise<User> {
  const { data } = await api.post<User>('/users', { name: name.trim() })
  return data
}
export async function saveEvent(input: ConfirmEventInput): Promise<EventRecord> {
  const { data } = await api.post<EventRecord>('/events', input)
  return data
}
export async function fetchEvents(userId: string): Promise<EventRecord[]> {
  const { data } = await api.get<{ events: EventRecord[] }>('/events', { params: { userId } })
  return data.events
}
export async function rebuildDashboard(userId: string): Promise<DashboardSnapshot> {
  const { data } = await api.post<DashboardSnapshot>(
    '/dashboard/rebuild',
    { userId },
    { timeout: 60000 },
  )
  return data
}
export async function fetchDashboard(userId: string): Promise<DashboardSnapshot | null> {
  const { data } = await api.get<{ dashboard: DashboardSnapshot | null }>('/dashboard', {
    params: { userId },
  })
  return data.dashboard
}
