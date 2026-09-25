import { api } from './api'
import type { CareerAnchorType, DashboardProfile, InsightSignal, TrailEvent } from '@/types/echo'

export interface LlmChatResponse {
  text: string
}

export async function chatLlm(
  messages: { role: 'user' | 'echo'; text: string }[],
): Promise<LlmChatResponse> {
  const { data } = await api.post<LlmChatResponse>(
    '/llm/chat',
    {
      messages: messages.map(({ role, text }) => ({
        role: role === 'echo' ? 'model' : 'user',
        text,
      })),
    },
    { timeout: 30_000 },
  )
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('模型未回傳文字。')
  return data
}

export interface InsightResponse {
  card: {
    title: string
    happen: string[]
    emotion: string
    like: string
    dislike: string
    value: string
    quote: string
  }
  careerAnchorType: CareerAnchorType
}

export async function generateInsightLlm(
  messages: { role: 'user' | 'echo'; text: string }[],
): Promise<InsightResponse> {
  const { data } = await api.post<InsightResponse>(
    '/llm/insight',
    {
      messages: messages.map(({ role, text }) => ({
        role: role === 'echo' ? 'model' : 'user',
        text,
      })),
    },
    { timeout: 60_000 },
  )
  if (!data.card || typeof data.careerAnchorType !== 'string') {
    throw new Error('模型產出格式錯誤。')
  }
  return data
}

export interface DashboardResponse {
  signals: InsightSignal[]
  dashboard: DashboardProfile
}

export async function generateDashboardLlm(events: TrailEvent[]): Promise<DashboardResponse> {
  const { data } = await api.post<DashboardResponse>(
    '/llm/dashboard',
    {
      events: events.map((event) => ({
        eventId: event.id,
        title: event.title,
        happen: event.happen,
        emotion: event.emotion,
        like: event.like,
        dislike: event.dislike,
        value: event.value,
        quote: event.quote,
        careerAnchorType: event.careerAnchorType,
      })),
    },
    { timeout: 60_000 },
  )
  if (!data.dashboard || !Array.isArray(data.signals)) {
    throw new Error('Dashboard 模型產出格式錯誤。')
  }
  return data
}
