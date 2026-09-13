import { createServer } from 'node:http'
import { ApiError, generateText, parseMessage, parseHistory } from './gemini.ts'

const server = createServer(async (request, response) => {
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  const send = (status: number, body: unknown) => {
    response.writeHead(status)
    response.end(JSON.stringify(body))
  }
  if (!['/api/llm/test', '/api/llm/chat'].includes(request.url ?? ''))
    return send(404, { error: '找不到此 API。' })
  if (request.method !== 'POST') return send(405, { error: '請使用 POST。' })
  // Local development only. Prevent cross-origin browser requests to this proxy.
  if (
    request.headers.origin &&
    request.headers.origin !== 'http://localhost:5173' &&
    request.headers.origin !== 'http://127.0.0.1:5173'
  ) {
    return send(403, { error: '不允許此來源。' })
  }
  if (!request.headers['content-type']?.startsWith('application/json')) {
    return send(415, { error: '請使用 application/json。' })
  }
  try {
    let raw = ''
    let bytes = 0
    request.setEncoding('utf8')
    for await (const chunk of request) {
      bytes += Buffer.byteLength(chunk)
      if (bytes > 100_000) throw new ApiError(413, '請求內容過大。')
      raw += chunk
    }
    let body: unknown
    try {
      body = JSON.parse(raw)
    } catch {
      throw new ApiError(400, 'JSON 格式錯誤。')
    }
    send(
      200,
      await generateText(request.url === '/api/llm/chat' ? parseHistory(body) : parseMessage(body)),
    )
  } catch (error) {
    send(error instanceof ApiError ? error.status : 500, {
      error: error instanceof ApiError ? error.message : '服務暫時無法使用。',
    })
  }
})

server.requestTimeout = 30_000
server.listen(3001, '127.0.0.1', () => {
  console.log('Gemini 本機測試 API：http://127.0.0.1:3001/api/llm/test')
})
