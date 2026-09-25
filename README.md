# EchoTrail Frontend

「曼陀號 PM x ENG 合作專案 EchoTrail」的前端 Repository。

## 分支規範

- `dev` 會觸發持續部署（Continuous Deployment）。
- 請先將改動推送至個人分支，再透過 Pull Request 合併至 `dev`。

## 部署

`dev` 分支的前端變更由 Cloud Build 執行品質檢查、Vite build 與 Firebase Hosting deploy。正式網站使用 `/api` 呼叫後端；Firebase Hosting 會將該路徑轉送到 Cloud Run。

部署設定與 Console 操作方式見 [前端雲端架構](docs/cloud-architecture.md)。不要從本機執行 `firebase deploy`，也不要建立或提交 Firebase token 或服務帳號 JSON key。

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

Gemini 金鑰與呼叫已移至 `echotrail-backend`。先依 backend README 設定 `.env.local` 並在 `127.0.0.1:8080` 啟動服務，再執行本 repo 的 `npm run dev`。聊天頁預設使用 Gemini 多輪對話，也可使用三組固定的三輪情境腳本，並產生 Echo Card 與可追溯的 Dashboard 訊號。完整契約見 [Gemini 串接說明](docs/specs/gemini-connection.md)。

- `src/lib/api.ts` 提供共用 Axios instance，透過 `VITE_API_BASE_URL` 設定後端網址，預設 `/api`。
- 本機串接獨立後端時，請設定後端網址並由後端允許 CORS，或另加 Vite proxy。
- `VITE_*` 會公開於瀏覽器，LLM API 金鑰必須保留在服務端。
- shadcn-vue 元件放在 `src/components/ui`，用 `npx shadcn-vue@latest add <元件名稱>` 按需加入。
- 部署 Vue Router history 模式時，主機需將前端路徑 fallback 到 `index.html`；API 路徑應另行處理。

## Gemini 對話流程

完整流程需要先啟動 `echotrail-backend` 並設定 Gemini API 金鑰。

1. 首頁自行輸入訊息，或從「規格被簡化」、「單次疏漏」、「跨團隊成功」選擇一組三輪情境。
2. 每一輪都由 Gemini 即時回覆；Enter 送出、Shift + Enter 換行。
3. 點 `Generate Insight` 取得 Gemini 產生的 Echo Card，再點「更新至 Dashboard」。
4. Dashboard 聚合 grounded signals，並保留每筆分數的原句證據。
5. My Trail 顯示所有已儲存事件，並預設選取最新一筆。
6. 「＋ New」開始新對話；「清除所有資料」會移除這個瀏覽器內的對話與 Echo Card。

資料存於瀏覽器 localStorage（`echotrail-v1`），重新整理後仍會保留。正式畫面沒有內建歷史事件、mock 回覆、固定 Echo Card 或 Dashboard fallback；三輪情境只提供輸入腳本，回覆與分析仍由 Gemini 產生。

- `src/data/conversation-scenarios.ts`：三組固定對話情境。
- `src/types/echo.ts`：對話、Echo Card 與 Dashboard 資料型別。
- `src/composables/useEcho.ts`：Gemini 對話、產生／儲存卡片與本機持久化。
- `/`、`/trail`、`/dashboard`：聊天、職涯軌跡、分析儀表板。
