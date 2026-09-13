import axios from 'axios'

// Uses the Vite proxy too, so this checks both local servers. No secret is read here.
try {
  const { data } = await axios.post<{ text: string }>(
    'http://127.0.0.1:5173/api/llm/test',
    { message: '這是虛構案例：小晴今天完成了紙飛機展覽的海報，覺得很有成就感。請用一句話摘要。' },
    { timeout: 30_000 },
  )
  if (typeof data.text !== 'string' || !data.text.trim()) throw new Error('empty response')
  console.log('Gemini 連線成功：', data.text)
} catch (error) {
  const detail: unknown = axios.isAxiosError(error) ? error.response?.data : undefined
  const message =
    typeof detail === 'object' &&
    detail !== null &&
    'error' in detail &&
    typeof detail.error === 'string'
      ? detail.error
      : '請確認 npm run dev:llm 已啟動且環境設定完成。'
  console.error('Gemini 測試失敗：', message)
  process.exitCode = 1
}
