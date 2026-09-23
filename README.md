# EchoTrail Frontend

「曼陀號 PM x ENG 合作專案 EchoTrail」的前端 Repository。

## 分支規範

- `dev` 會觸發持續部署（Continuous Deployment）。
- 請先將改動推送至個人分支，再透過 Pull Request 合併至 `dev`。

## 開發環境

- Node.js 24（使用 nvm 時執行 `nvm install`、`nvm use`）
- npm 11，統一使用 `package-lock.json`
- Vue 3、TypeScript、Vite、Vue Router
- Tailwind CSS、shadcn-vue、Axios、Vitest、ESLint、Prettier

```sh
npm install
cp .env.example .env.local
npm run dev
```

若現有 npm 10 發生依賴解析錯誤，可使用 `npx npm@11 install`。

## 常用指令

```sh
npm run build        # 型別檢查與正式打包
npm run type-check   # Vue / TypeScript 型別檢查
npm run lint         # ESLint 檢查
npm run lint:fix     # ESLint 自動修正
npm run format      # 格式化 src
npm run format:check
npm test            # 執行一次 Vitest
npm run test:unit    # Vitest 監看模式
npm run preview     # 預覽打包結果
```

## API 與元件

### Gemini 本機連線測試

Gemini 金鑰與呼叫已移至 `echotrail-backend`。先依 backend README 設定 `.env.local` 並在 `127.0.0.1:8080` 啟動服務，再執行本 repo 的 `npm run dev`。聊天頁可切換 Gemini 多輪對話、使用三輪固定腳本，並產生真實 Echo Card 與可追溯的 Dashboard 訊號。完整契約見 [Gemini 串接說明](docs/specs/gemini-connection.md)。

- `src/lib/api.ts` 提供共用 Axios instance，透過 `VITE_API_BASE_URL` 設定後端網址，預設 `/api`。
- 本機串接獨立後端時，請設定後端網址並由後端允許 CORS，或另加 Vite proxy。
- `VITE_*` 會公開於瀏覽器，LLM API 金鑰必須保留在服務端。
- shadcn-vue 元件放在 `src/components/ui`，用 `npx shadcn-vue@latest add <元件名稱>` 按需加入。
- 部署 Vue Router history 模式時，主機需將前端路徑 fallback 到 `index.html`；API 路徑應另行處理。

## 假資料流程

目前可直接以 `npm run dev` 展示完整前端流程，無須啟動後端或設定 API 金鑰。

1. 首頁輸入訊息，或點日記／履歷／隨心聊聊卡片帶入示範文字。
2. 送出後取得簡易 mock 回覆，可持續對話；Enter 送出、Shift + Enter 換行。
3. 點 `Generate Insight` 產生 Echo Card，再點「更新至 Dashboard」。
4. Dashboard 依已儲存事件的 grounded signals 聚合 RIASEC、DISC 與職涯錨點，並可追溯每筆分數的原句證據。完整範圍見 [Dashboard 規格](docs/specs/dashboard.md)。
5. My Trail 預設顯示事件 6 詳情；右上角獨立的 V2 按鈕可展開季度摘要、事件切換與重新討論。完整範圍見 [My Trail 規格](docs/specs/my-trail.md)。
6. 「＋ New」開始新對話；「重設示範資料」確認後恢復初始六筆事件。

資料存於瀏覽器 localStorage（`echotrail-demo-v1`），重新整理會保留；儲存不可用時仍可在當次頁面操作。
歷史事件與假資料模式的 Echo Card 使用固定示範資料；假資料產卡附上固定圖表訊號供離線展示。Gemini 模式的卡片與圖表訊號則由 backend 根據對話產生。重新討論會更新原事件，不新增重複事件。
履歷與隨心聊聊入口僅帶入示範文字，沒有檔案解析、真實 AI 或後端請求。

- `src/mocks/echo.ts`：歷史事件、示範輸入與 mock 回覆。
- `src/composables/useEcho.ts`：對話、產生／儲存卡片、本機持久化與重設。
- `/`、`/trail`、`/dashboard`：聊天、職涯軌跡、分析儀表板。
