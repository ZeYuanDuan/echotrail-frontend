# Gemini 對話、產卡與訊號 API

## 範圍

前端預設且只使用 Gemini 對話，完成以下閉環：

1. 第 1～10 輪使用陪伴探索 prompt，第 11～15 輪使用積極收斂 prompt。
2. 使用者點擊 Generate Insight，或送出第 16 輪內容時，前端把完整逐字稿送至 `POST /api/llm/insight`。
3. 後端只產生結構化 Echo Card 與有逐字證據的 RIASEC／DISC／Schein 訊號；前端先顯示暫存預覽，不儲存為 My Trail 事件。使用者若繼續對話，預覽會失效，並可以再次產生新的洞察。
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

`POST /api/llm/insight` 接受同一份逐字稿，可由 `model` 訊息結尾。它只產生 Echo Card 與事件層級圖表訊號，不產生 Dashboard profile：

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
  ]
}
```

`POST /api/events` 保存確認後的卡片、逐字訊息及訊號；`POST /api/dashboard/rebuild` 再由後端讀取該使用者的全部已確認事件，建立並保存 Dashboard profile 與框架分數快照。

產卡 API 驗證 Echo Card `quote` 與每個訊號 `evidenceQuote` 都是某一則 user 訊息的精確 substring，且至少包含 4 個文字或數字；證據不足時 `signals` 可以是空陣列。後端也會驗證 framework 與 dimension 的允許組合、強度範圍及同事件維度不可重複。產出不合格時最多讓模型修正重試兩次，並以欄位索引、允許代碼或引文條件指出失敗原因。Dashboard rebuild 的 Persona 與行為模式引文則會再次對全部已保存 user 訊息或使用者明確編輯過的卡片引言進行 grounding。

## 固定腳本與穩定性

首頁下方提供「規格被簡化」、「單次疏漏」與「跨團隊成功」三組固定情境，每組各有三輪。第一輪腳本送出後，才同時顯示三個情境的第二輪卡片；第二輪送出後再顯示三個第三輪卡片，第三輪送出後不再顯示腳本卡片。各輪可自由切換情境，不必延續上一輪的腳本；每一輪回覆仍由 Gemini 即時產生。backend 的 `npm run test:gemini` 會對已啟動的 API 節流執行五次完整三輪對話、產卡與 Dashboard 更新，逐次輸出耗時與 grounded signal 數量。預設每次請求間隔五秒，避免測試程式以不符合真人操作的突發流量撞上速率限制；可用 `REQUEST_INTERVAL_MS` 調整。此測試會呼叫真實 Gemini；一般 `npm test` 不會。

## 錯誤與隱私

- 前端送出期間防止重複操作；失敗時保留原輸入供重試。
- 後端單一請求流程（含 grounding 修正重試）共用 25 秒 deadline；前端產卡等待上限為 60 秒。
- 上游錯誤與 request headers 不會直接回傳，避免洩漏 API key。
- 未確認對話與卡片預覽只保存在目前頁面記憶體；確認後的事件與 Dashboard 快照由後端保存。展示暱稱不是正式認證。
- 固定情境是虛構內容；自行輸入時仍不應提供真實敏感資料。
