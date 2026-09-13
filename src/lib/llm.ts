import { api } from './api'

export interface LlmTestResponse {
  text: string
}

export async function chatLlm(
  messages: { role: 'user' | 'echo'; text: string }[],
): Promise<LlmTestResponse> {
  const { data } = await api.post<LlmTestResponse>(
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

export async function testLlm(message: string): Promise<LlmTestResponse> {
  const { data } = await api.post<LlmTestResponse>('/llm/test', { message }, { timeout: 30_000 })
  return data
}
