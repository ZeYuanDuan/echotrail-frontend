import axios from 'axios'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

interface GeminiResponse {
  candidates?: {
    finishReason?: string
    content?: { parts?: { text?: string; thought?: boolean }[] }
  }[]
  promptFeedback?: { blockReason?: string }
}

export function parseMessage(body: unknown): string {
  if (
    typeof body !== 'object' ||
    body === null ||
    !('message' in body) ||
    typeof body.message !== 'string' ||
    !body.message.trim() ||
    body.message.length > 2000
  ) {
    throw new ApiError(400, '請提供 1–2000 字的測試文字。')
  }
  return body.message.trim()
}

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export function parseHistory(body: unknown): ChatMessage[] {
  if (!body || typeof body !== 'object' || !('messages' in body) || !Array.isArray(body.messages)) {
    throw new ApiError(400, '對話格式錯誤。')
  }
  const messages: ChatMessage[] = body.messages.map((item: unknown, index: number) => {
    if (
      !item ||
      typeof item !== 'object' ||
      !('role' in item) ||
      item.role !== (index % 2 === 0 ? 'user' : 'model') ||
      !('text' in item)
    ) {
      throw new ApiError(400, '對話順序錯誤。')
    }
    return { role: index % 2 === 0 ? 'user' : 'model', text: parseMessage({ message: item.text }) }
  })
  if (
    !messages.length ||
    messages.length > 31 ||
    messages.length % 2 !== 1 ||
    messages.reduce((sum, message) => sum + message.text.length, 0) > 16000
  ) {
    throw new ApiError(400, '此對話已達長度限制，請開始新對話。')
  }
  return messages
}

export async function generateText(message: string | ChatMessage[]): Promise<{ text: string }> {
  const key = process.env.GEMINI_API_KEY?.trim()
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite'
  if (!key) throw new ApiError(503, '請在 .env.server.local 設定 GEMINI_API_KEY 並重啟服務。')
  if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new ApiError(503, 'GEMINI_MODEL 設定無效。')

  try {
    const { data } = await axios.post<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        systemInstruction: {
          parts: [
            {
              text:
                typeof message === 'string'
                  ? '這是虛構資料連線測試。請以繁體中文簡短回覆，不超過三句。'
                  : '你是 EchoTrail 的職涯陪跑教練艾可。使用繁體中文與台灣用語，溫暖但具體。每次簡短引用使用者原話、提出一個具體觀察，再問一個開放式問題。依對話了解發生的事情、感受、在意的點與不能接受的點，避免反覆詢問已回答的內容。不給空泛安慰，不捏造經歷或聲稱已更新卡片或儀表板。這是虛構資料的對話測試。',
            },
          ],
        },
        contents: (typeof message === 'string' ? [{ role: 'user', text: message }] : message).map(
          ({ role, text }) => ({ role, parts: [{ text }] }),
        ),
        generationConfig: { maxOutputTokens: 512 },
      },
      { headers: { 'x-goog-api-key': key }, timeout: 25_000 },
    )
    const candidate = data.candidates?.[0]
    if (data.promptFeedback?.blockReason || candidate?.finishReason === 'SAFETY') {
      throw new ApiError(422, '此測試文字未取得可顯示的回覆，請更換虛構文字。')
    }
    const text = candidate?.content?.parts
      ?.filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
      .trim()
    if (!text) throw new ApiError(502, 'Gemini 沒有回傳文字，請稍後重試。')
    return { text }
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') throw new ApiError(504, 'Gemini 回覆逾時。')
      if (error.response?.status === 429) {
        throw new ApiError(429, 'Gemini 免費額度或速率已達上限，請至 AI Studio 確認。')
      }
      if ([400, 401, 403, 404].includes(error.response?.status ?? 0)) {
        throw new ApiError(502, '請確認 Gemini 金鑰權限、模型名稱與該模型的可用額度。')
      }
    }
    // Never expose upstream errors: Axios errors can contain the API key in headers.
    throw new ApiError(502, '暫時無法連線 Gemini，請稍後重試。')
  }
}
