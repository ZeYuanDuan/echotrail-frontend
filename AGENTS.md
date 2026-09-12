# EchoTrail 前端程式撰寫規則

## 基礎與範圍

- 使用 Vue 3、TypeScript、Vite、Vue Router、Tailwind CSS、shadcn-vue、Axios 與 Vitest。
- 使用 npm 與 `package-lock.json`；Node.js 版本依 `.nvmrc`，套件版本依 `package.json`；安裝與啟動方式見 README。
- 修改前閱讀相關程式碼、共用元件與既有規格；只處理本次需求，不變動無關工作區內容。
- 功能開發前先查閱 `docs/specs/` 的相關規格；新增或調整功能流程時，同步建立或更新對應文件，簡單修正可免。
- 額外套件、共用封裝與目錄按需加入；假資料與畫面呈現分開，方便替換為 API。

## 程式與目錄

- 元件使用 `.vue`、`<script setup lang="ts">` 與 `<template>`；狀態使用 `ref`／`reactive`，衍生資料優先使用 `computed`。
- Props、事件、領域資料與 API 應有明確型別；不直接修改 props，避免 `any`，不以停用檢查或強制斷言掩蓋問題。
- 頁面放 `src/views/`，路由設定放 `src/router/`；站內導覽使用 `RouterLink` 或 Vue Router，網址使用 kebab-case 與 `:id` 動態參數。
- 基礎 UI 放 `src/components/ui/`，功能共用元件放 `src/components/<feature>/`；響應式共用邏輯放 `src/composables/`，純工具放 `src/lib/`。
- 元件使用 PascalCase（頁面如 `HomeView.vue`），composable 使用 `use` 前綴；一般工具與型別檔名使用 kebab-case。
- 跨目錄匯入優先使用 `@/`；群組內沿用相對匯入與既有 `index.ts` 匯出方式。
- 格式依 Prettier 與 ESLint：兩格縮排、單引號、不加分號。

## API 與 UI

- API 統一使用 `src/lib/api.ts` 匯出的 `api` 與 `VITE_API_BASE_URL`，不在頁面另建 Axios instance；回應型別依實際後端契約。
- 非同步操作處理載入、空資料與錯誤狀態；異動後更新受影響資料，送出期間防止重複操作。
- `VITE_*` 會公開於瀏覽器；LLM API 金鑰與其他機密保留在服務端，不寫入前端程式或 Git。
- 新增 UI 前搜尋並重用現有元件；優先使用 shadcn-vue，依實際 props、事件與 slots 撰寫，不假設存在未建立的封裝。
- 使用 `src/assets/main.css` 的語意色，如 `bg-background`、`text-muted-foreground`；避免硬編碼色碼，兼顧亮色與暗色主題。
- 版面優先使用 flex／grid 與 gap；條件樣式使用 `:class`，合併 Tailwind 類別使用 `cn()`，共用變體沿用 CVA；圖示使用 `@lucide/vue`。
- UI 保留表單 label、鍵盤操作與可存取名稱，確認手機、平板與桌面不溢出；破壞性操作需確認。

## 驗證與 Git

- 程式變更執行 `npm run lint`、`npm run type-check`、`npm run format:check`；修正格式使用 `npm run format`。
- 重要邏輯與流程使用 Vitest／Vue Test Utils 驗證並執行 `npm test`；環境或打包變更執行 `npm run build`。
- UI 變更另驗證實際操作與響應式版面；純文件修改不必重跑程式測試。
- 分支使用 `feat/`、`fix/`、`refactor/`、`docs/`、`chore/` 或 `test/`；commit 使用 Conventional Commit 前綴且只包含相關變更。
- `dev` 會觸發持續部署，依 README 透過功能分支與 PR 合併，不直接提交或推送到 `dev`。
- Commit、push 或 PR 前逐一檢查範圍內檔案與檔名，移除 Notion 私有管理識別資訊與連結，改用穩定功能名稱；無法安全替換時先詢問。
