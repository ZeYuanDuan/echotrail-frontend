# EchoTrail Frontend

EchoTrail 的 Vue 3、TypeScript 前端。正式流程使用暱稱查找展示使用者，經後端保存已確認 Echo Card，並明確更新 Dashboard。暱稱只供工程展示，不是身分驗證。

## 開發

使用 `.nvmrc` 指定的 Node.js 版本及 npm／`package-lock.json`。先依 backend README 啟動 PostgreSQL、執行 migration 並啟動後端，再啟動前端：

```sh
npm ci
cp .env.example .env.local
npm run dev
```

`VITE_API_BASE_URL` 預設為 `/api`；本機由 Vite proxy 轉送到 `127.0.0.1:8080`。Gemini 金鑰和資料庫密碼只放在後端。正式網站由 Firebase Hosting 把 `/api/**` 轉送到 Cloud Run。

## 使用流程

1. 輸入暱稱；重新載入時會向後端再次查找。
2. 聊天並按 `Generate Insight` 產生**未儲存**的卡片預覽，可編輯欄位。
3. 按「確認 Echo Card」後，My Trail 立即可讀取這張卡。
4. 按「更新至 Dashboard」才全量重算，成功後跳到 Dashboard；失敗時卡片保留供重試。
   若確認後先離開或重新整理，可在 My Trail 按同名按鈕完成更新。
5. 「繼續此對話」可產生下一張卡，僅上傳新增訊息片段；`＋ New` 開始新對話。

My Trail 和 Dashboard 從 API 讀取持久化資料，不使用瀏覽器中的示範事件。完整契約見 [前端架構](docs/frontend-architecture.md)、[My Trail](docs/specs/my-trail.md) 與 [Dashboard](docs/specs/dashboard.md)。

## 品質檢查與部署

```sh
npm test
npm run lint
npm run type-check
npm run format:check
npm run build
```

`dev` 會觸發 Cloud Build 與 Firebase Hosting 部署。請在功能分支提交，再以 Pull Request 合併到 `dev`。
