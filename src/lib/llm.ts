import { api } from './api'
import type { DashboardProfile, InsightSignal } from '@/mocks/echo'

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
  signals: InsightSignal[]
  dashboard: DashboardProfile
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
  if (!data.card || !Array.isArray(data.signals)) throw new Error('模型產出格式錯誤。')
  return data
}
