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

- `src/lib/api.ts` 提供共用 Axios instance，透過 `VITE_API_BASE_URL` 設定後端網址，預設 `/api`。
- 本機串接獨立後端時，請設定後端網址並由後端允許 CORS，或另加 Vite proxy。
- `VITE_*` 會公開於瀏覽器，LLM API 金鑰必須保留在服務端。
- shadcn-vue 元件放在 `src/components/ui`，用 `npx shadcn-vue@latest add <元件名稱>` 按需加入。
- 部署 Vue Router history 模式時，主機需將前端路徑 fallback 到 `index.html`；API 路徑應另行處理。

目前為環境骨架，產品假資料流程及 LLM API 連線尚未實作。
