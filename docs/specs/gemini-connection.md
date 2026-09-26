# Gemini 對話、產卡與訊號 API

## 範圍

前端預設且只使用 Gemini 對話，完成以下閉環：

1. 第 1～10 輪使用陪伴探索 prompt，第 11～15 輪使用積極收斂 prompt。
2. 使用者點擊 Generate Insight，或送出第 16 輪內容時，前端把完整逐字稿送至 `POST /api/llm/insight`。
3. 後端只產生結構化 Echo Card 與本次事件的職涯錨分類；前端先顯示暫存預覽，不儲存為 My Trail 事件。使用者若繼續對話，預覽會失效，並可以再次產生新的洞察。
4. 使用者點擊「確認 Echo Card」後，前端先把預覽儲存為事件，再由後端依目前全部已確認事件全量重算 Dashboard 與圖表訊號；成功後前往 Dashboard，重算失敗時保留已保存事件並提供重試。

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

訊息必須由 `user` 開始並交替排列，聊天請求以 `user` 結尾。單則最多 800 字、單次最多 31 則、總長最多 16,000 字。

成功回傳 `{ "text": "..." }`。後端依 user 訊息數選擇 prompt，前端不能指定階段。「嗨，我是艾可。」只允許出現在第一輪；後續回覆不得重複自我介紹。回覆應直接處理使用者表達的意思，不得以「聽到你說……」等固定句型重複原話；只有關鍵詞能支撐具體觀察時，才可引用最短必要片段。第 16 輪不呼叫此 API，而會自動進入產卡流程。

## 產卡與 Dashboard 契約

`POST /api/llm/insight` 接受同一份逐字稿，可由 `model` 訊息結尾。它只產生 Echo Card，不產生 Dashboard：

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
  "careerAnchorType": "專家達人"
}
```

`POST /api/llm/dashboard` 接受目前瀏覽器保存的全部 Echo Card。資料庫完成後，將改由後端依登入使用者取得相同資料。成功回傳：

```json
{
  "signals": [
    {
      "framework": "riasec",
      "dimension": "I",
      "strength": 8,
      "evidenceQuote": "Echo Card 引證原話"
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

產卡 API 驗證 Echo Card `quote` 是某一則 user 訊息的精確 substring。Dashboard API 每次以全部事件重算，另將事件引言整理成 `allowedEvidenceQuotes` 清單，要求模型完整複製其中一筆作為 Persona `quote`、行為模式與框架訊號的 `evidenceQuote`；證據不足時圖表訊號可以是空陣列。所有引用至少需包含 4 個文字或數字，空白、標點與其他符號不計；後端也會驗證框架與維度的允許組合、權重、陣列數量及兩處主要職涯錨一致。產出不合格時最多讓模型修正重試兩次，並以欄位索引和允許代碼指出失敗原因。

## 固定腳本與穩定性

首頁下方提供「規格被簡化」、「單次疏漏」與「跨團隊成功」三組固定情境，每組各有三輪。第一輪由情境卡帶入，送出後只顯示同一情境的下一輪操作，避免中途混用；每一輪回覆仍由 Gemini 即時產生。backend 的 `npm run test:gemini` 會對已啟動的 API 節流執行五次完整三輪對話與產卡，逐次輸出耗時與 grounded signal 數量。預設每次請求間隔五秒，避免測試程式以不符合真人操作的突發流量撞上速率限制；可用 `REQUEST_INTERVAL_MS` 調整。此測試會呼叫真實 Gemini；一般 `npm test` 不會。

## 錯誤與隱私

- 前端送出期間防止重複操作；失敗時保留原輸入供重試。
- 後端單一請求流程（含 grounding 修正重試）共用 25 秒 deadline；前端產卡等待上限為 60 秒。
- 上游錯誤與 request headers 不會直接回傳，避免洩漏 API key。
- 對話與產卡結果會儲存在目前瀏覽器的 `echotrail-v1` localStorage；本版本未提供正式帳號、跨裝置同步或雲端事件儲存。
- 固定情境是虛構內容；自行輸入時仍不應提供真實敏感資料。
