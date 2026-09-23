# Gemini 對話、產卡與訊號 API

## 範圍

前端可在假資料與 Gemini 模式間切換。Gemini 模式完成以下閉環：

1. 使用者逐輪輸入，前端呼叫 EchoTrail backend 的 `POST /api/llm/chat`。
2. 使用者點擊 Generate Insight，前端把完整逐字稿送至 `POST /api/llm/insight`。
3. 後端產生結構化 Echo Card、Dashboard 五類主要洞察與 RIASEC／DISC／Schein 訊號。
4. 前端儲存本次結果，更新 My Trail，並以訊號聚合 Dashboard 圖表。

LLM 金鑰與 system prompt 都只存在 `echotrail-backend`。前端不接受、保存或傳送 system prompt 與金鑰。

## 本機啟動

在 backend repo 複製 `.env.example` 為 `.env.local`，填入 `GEMINI_API_KEY`，再啟動：

```bash
npm run dev
```

backend 預設監聽 `127.0.0.1:8080`。前端另開終端執行 `npm run dev`；Vite 會把 `/api` 代理至 backend。

## 對話契約

`POST /api/llm/chat` 輸入：

```json
{
  "messages": [
    { "role": "user", "text": "..." },
    { "role": "model", "text": "..." },
    { "role": "user", "text": "..." }
  ]
}
```

訊息必須由 `user` 開始並交替排列，聊天請求以 `user` 結尾。單則最多 2,000 字、單次最多 31 則、總長最多 16,000 字。

成功回傳 `{ "text": "..." }`。艾可回覆遵守「引用原句、指出一個觀察、只問一題」，並依序收集事件、情緒、在意與不能接受的點。

## 產卡與圖表訊號契約

`POST /api/llm/insight` 接受同一份逐字稿，可由 `model` 訊息結尾。成功回傳：

```json
{
  "card": {
    "title": "事件標題",
    "happen": ["事件摘要"],
    "emotion": "事件相關情緒",
    "like": "我在意……",
    "dislike": "我不喜歡……",
    "value": "價值主張",
    "quote": "使用者逐字原句"
  },
  "signals": [
    {
      "framework": "riasec",
      "dimension": "I",
      "strength": 8,
      "evidenceQuote": "使用者逐字原句"
    }
  ],
  "dashboard": {
    "persona": { "headline": "...", "summaries": ["..."], "quote": "逐字原句" },
    "anchor": {
      "primary": "專家達人",
      "ability": ["..."],
      "motivation": ["..."],
      "values": ["..."]
    },
    "keywords": [{ "text": "問題拆解", "weight": 5 }],
    "patterns": [{ "title": "先釐清再行動", "evidenceQuote": "逐字原句" }],
    "northStar": {
      "primaryAnchor": "專家達人",
      "tagline": "...",
      "desires": ["..."],
      "bottomLine": "...",
      "nextSteps": ["..."]
    }
  }
}
```

後端會驗證 Echo Card `quote`、Persona `quote`、行為模式與框架訊號的每個 `evidenceQuote` 都是某一則 user 訊息的精確 substring，並驗證框架維度、權重與陣列數量。產出不合格時，後端會把失敗 JSON 與具體驗證原因回饋給模型，最多修正重試兩次；仍不合格才回傳錯誤，不把未 grounded 的內容送進 Dashboard。

## 固定腳本與穩定性

Gemini 模式提供「規格被簡化」、「單次疏漏」與「跨團隊成功」三組固定腳本按鈕，每組各有三輪，每輪仍取得真實模型回覆。對話第一輪送出後會鎖定所選腳本，避免中途混用不同情境。backend 的 `npm run test:gemini` 會對已啟動的 API 節流執行五次完整三輪對話與產卡，逐次輸出耗時與 grounded signal 數量。預設每次請求間隔五秒，避免測試程式以不符合真人操作的突發流量撞上速率限制；可用 `REQUEST_INTERVAL_MS` 調整。此測試會呼叫真實 Gemini；一般 `npm test` 不會。

## 錯誤與隱私

- 前端送出期間防止重複操作；失敗時保留原輸入供重試。
- 後端逾時為 25 秒；前端產卡等待上限為 60 秒。
- 上游錯誤與 request headers 不會直接回傳，避免洩漏 API key。
- 固定腳本是虛構資料；本版本未提供正式帳號、雲端事件儲存或個資刪除流程，不應輸入真實敏感資料。
