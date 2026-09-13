# Gemini 最小文字串接

聊天頁可切換假資料與 Gemini 多輪對話；本輪不產生真實 Echo Card。

## 設定與啟動

使用 `.nvmrc` 指定的 Node.js 24。根目錄 `.env.server.local` 已準備空白金鑰欄位，填入：

```dotenv
GEMINI_API_KEY=在本機填入你的金鑰
GEMINI_MODEL=gemini-3.5-flash-lite
```

該檔案已由 `.gitignore` 排除，僅由 Node 的 `--env-file` 載入，不要把金鑰貼到聊天、前端或 `VITE_*`。其他開發者可將 `server/.env.example` 複製到根目錄並命名為 `.env.server.local`。更改設定後重啟服務；shell 中同名環境變數會優先於檔案。

前端 `VITE_API_BASE_URL` 使用 `/api`（預設值）。

```sh
nvm use
npm run dev:llm
```

另開終端，執行一次虛構文字測試（會消耗該金鑰的模型額度）：

```sh
nvm use
npm run test:gemini
```

測試成功會顯示「Gemini 連線成功」與一句摘要。缺少金鑰時回傳設定提示；429 表示速率或額度限制，需在 AI Studio 確認，不自動重試、不切換其他模型或啟用付費。Free tier 不代表所有模型都有免費額度。

## 契約與範圍

- `POST /api/llm/test`：輸入 `{ "message": "虛構文字" }`，1–2000 字。
- 成功：`200 { "text": "模型回覆" }`；失敗：非 2xx `{ "error": "安全的錯誤訊息" }`。
- 前端可使用 `src/lib/llm.ts` 的 `testLlm`，沿用共用 Axios `api`。
- `test:gemini` 經 Vite 5173 代理到 Node 3001，再呼叫 Gemini，測完整本機 HTTP 路徑。
- Node 僅監聽 `127.0.0.1:3001`；此服務沒有正式使用者驗證，只供本機開發，不能直接公開部署。
- 金鑰只放在上游請求 header；不記錄原始 Axios 錯誤、輸入文字或金鑰。
- Gemini 對話僅存於記憶體，不寫入 localStorage、不上傳履歷；假資料模式沿用既有儲存。
- 模型先使用 `gemini-3.5-flash-lite`；帳號實際可用性須在金鑰填入後驗證。

## 驗證

單元測試模擬 Gemini 回應，驗證輸入限制、空白／被阻擋回覆、429、逾時與金鑰不洩漏。`npm test` 不會呼叫真實 Gemini；`npm run test:gemini` 與 Gemini 模式的送出按鈕會呼叫真實 API。

官方文件：[generateContent](https://ai.google.dev/api/generate-content)、[模型](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite)、[金鑰](https://ai.google.dev/gemini-api/docs/api-key)、[額度](https://ai.google.dev/gemini-api/docs/rate-limits)。

## 2026-09-13 連線驗證

新帳號呼叫 `gemini-2.5-flash-lite` 收到 404，Google 回應建議改用 `gemini-3.5-flash-lite`。確認官方定價列有免費文字額度後，已更新模型設定，經 Vite → Node → Gemini 成功取得固定虛構案例的繁體中文回覆。此結果確認金鑰與當下模型可用，不代表剩餘配額無上限。

## 聊天模式切換

- 聊天頁上方「切換 Gemini 對話」按鈕啟用即時回覆，再點「切回假資料」恢復示範對話。初始為假資料，切換不會送出 API。
- 兩模式分別保留本次對話與草稿；Gemini 歷史不讀入既有示範資料、不寫入 localStorage，重新整理後清除。側邊欄 ＋ New 清除目前模式的對話。
- 送出期間禁止重複送出或切換模式；錯誤顯示在輸入框上方，草稿恢復供手動重試，不自動重送。
- Gemini 模式隱藏 Generate Insight，Dashboard 與事件分析仍為示範資料。
- `POST /api/llm/chat` 接收 `{ messages: [{ role: 'user' | 'model', text: string }] }`，成功與錯誤契約同 test API。
- 歷史需 user/model 交替、user 結尾，每則最多 2000 字，單次最多 31 則訊息、總文字 16000 字。每段最多 16 輪，達上限可開始新對話。
- 服務端設定艾可語氣與單一問題引導，不接受前端傳入 system prompt 或金鑰。
