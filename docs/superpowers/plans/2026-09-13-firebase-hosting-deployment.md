# Firebase Hosting 部署實作計畫

> **歷史里程碑：** 本計畫記錄 2026-09-13 Firebase Hosting 部署時的限制與步驟；核取方塊未同步標示現況。現在的持久化前端工作請依 2026-09-25 的計畫及目前程式碼執行，不要把本文件的「無資料庫」階段限制套用到新工作。

> **供實作代理參考：** 必須使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans，依序完成本計畫各任務。步驟以核取方塊（`- [ ]`）追蹤。

**目標：** 將 `dev` 分支的 Vue／Vite `dist/` 產物部署到 Firebase Hosting，並將同源的 `/api/...` 請求轉送至既有 Cloud Run 後端。

**架構：** Firebase Hosting 提供靜態檔案及 Vue history router 的備援路由。第一條 rewrite 將 `/api` 與 `/api/**` 原樣轉送到 `asia-east1` 的 `echotrail-backend`，後續 catch-all rewrite 回傳 `index.html`。專用 Cloud Build 服務帳號執行前端 trigger、本機品質檢查與 `dist/` 建置，再以 Application Default Credentials 僅部署 Firebase Hosting。

**技術：** Vue 3、Vite 8、Vitest 4、Firebase Hosting、Firebase CLI 15.30.0、Cloud Build、Cloud Run。

**規格：** `docs/adr/0001-firebase-hosting-deployment-decisions.md`

## 全域限制

- 目標專案：`echotrail-dev-508500-k6`。
- 目標 Cloud Run 服務：`asia-east1` 的 `echotrail-backend`。
- 只從前端 repository 的 `dev` 分支部署，不建立 PR 預覽頻道。
- 維持 `VITE_API_BASE_URL=/api`。前端原始碼或 `VITE_*` 變數不得包含 Cloud Run URL、LLM key、token 或服務帳號憑證。
- 公開產品路由使用 `/api/...`。`GET /health` 保持為直接呼叫 Cloud Run 的維護端點。
- 此里程碑的 Cloud Run 仍允許公開呼叫，不加入使用者身分驗證、API Gateway、負載平衡器、資料庫或正式環境資源。
- Cloud Build 中的 Firebase CLI 使用 Application Default Credentials；不使用 `firebase login`、個人 token 或服務帳號 JSON key。
- 使用 `npm`、`package-lock.json`、Node.js 24，以及 `npm run lint`、`npm run type-check`、`npm run format:check`、`npm test`、`npm run build`。

---

## 檔案結構

| 檔案 | 職責 |
| --- | --- |
| `firebase.json` | 設定 `dist/` 為 Hosting 根目錄、快取標頭、Cloud Run API rewrite 及 Vue SPA 備援。 |
| `.firebaserc` | 將此 repository 的預設 Firebase 別名指向 `echotrail-dev-508500-k6`。 |
| `.gitignore` | 排除 Firebase CLI 的本機 `.firebase/` 快取。 |
| `src/__tests__/firebase-hosting-config.spec.ts` | 防止意外修改 Hosting 公開目錄、rewrite 順序、Cloud Run 目標與快取標頭。 |
| `cloudbuild.yaml` | 以專用服務帳號在 Cloud Build 執行前端品質檢查並部署 Hosting。 |
| `docs/cloud-architecture.md` | 記錄前端部署流程、存取邊界、Console 設定、驗證與回滾。 |
| `docs/frontend-architecture.md` | 將原先「正式部署仍需設定」改成已採納的 Hosting 架構。 |
| `README.md` | 提供精簡部署契約與操作架構文件連結。 |

## 任務 1：加入 Firebase Hosting 契約與回歸測試

**檔案：**

- 新增：`firebase.json`
- 新增：`.firebaserc`
- 修改：`.gitignore`
- 新增：`src/__tests__/firebase-hosting-config.spec.ts`

**介面：**

- 使用：Vite 產生的 `dist/` 目錄與 `asia-east1` 既有的 `echotrail-backend` Cloud Run 服務。
- 提供：依序將 `/api{,/**}` 轉送 Cloud Run，再將 `**` 轉送 `/index.html` 的 Hosting rewrite 設定。

- [ ] **步驟 1：先寫會失敗的 Hosting 設定測試**

建立 `src/__tests__/firebase-hosting-config.spec.ts`，內容如下：

```ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

type Header = { key: string; value: string }
type HostingConfig = {
  public: string
  rewrites: Array<{
    source: string
    destination?: string
    run?: { serviceId: string; region: string }
  }>
  headers: Array<{ source: string; headers: Header[] }>
}

const firebaseConfig = JSON.parse(
  readFileSync(new URL('../../firebase.json', import.meta.url), 'utf8'),
) as { hosting: HostingConfig }

describe('Firebase Hosting configuration', () => {
  it('serves the Vite bundle, forwards API paths first, and falls back to the SPA', () => {
    expect(firebaseConfig.hosting.public).toBe('dist')
    expect(firebaseConfig.hosting.rewrites).toEqual([
      {
        source: '/api{,/**}',
        run: { serviceId: 'echotrail-backend', region: 'asia-east1' },
      },
      { source: '**', destination: '/index.html' },
    ])
  })

  it('does not cache HTML forever and caches hashed Vite assets immutably', () => {
    expect(firebaseConfig.hosting.headers).toEqual([
      {
        source: '/index.html',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
      {
        source: '/assets/**',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ])
  })
})
```

- [ ] **步驟 2：執行測試，確認會失敗**

執行：

```sh
npm test -- src/__tests__/firebase-hosting-config.spec.ts
```

預期：`firebase.json` 尚不存在，因此測試失敗。

- [ ] **步驟 3：加入 Firebase 專案與 Hosting 設定**

建立 `.firebaserc`：

```json
{
  "projects": {
    "default": "echotrail-dev-508500-k6"
  }
}
```

建立 `firebase.json`：

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "headers": [
      {
        "source": "/index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
      },
      {
        "source": "/assets/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ],
    "rewrites": [
      {
        "source": "/api{,/**}",
        "run": {
          "serviceId": "echotrail-backend",
          "region": "asia-east1"
        }
      },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

將以下內容加入 `.gitignore`：

```gitignore
.firebase/
```

- [ ] **步驟 4：執行聚焦測試，確認通過**

執行：

```sh
npm test -- src/__tests__/firebase-hosting-config.spec.ts
```

預期：兩項測試都通過。

- [ ] **步驟 5：執行完整本機品質檢查**

執行：

```sh
npm run lint
npm run type-check
npm run format:check
npm test
npm run build
```

預期：所有指令均以狀態碼 0 結束，`npm run build` 產生 `dist/`。

- [ ] **步驟 6：提交 Hosting 契約**

```sh
git add .firebaserc .gitignore firebase.json src/__tests__/firebase-hosting-config.spec.ts
git commit -m "build: configure Firebase Hosting"
```

## 任務 2：加入前端 Cloud Build 部署流程

**檔案：**

- 新增：`cloudbuild.yaml`

**介面：**

- 使用：`package-lock.json`、`firebase.json`、`.firebaserc`、`dist/` 產物，以及 `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com` 的 ADC。
- 提供：前端品質檢查通過後，將 `echotrail-dev-508500-k6` 部署到 Firebase Hosting 正式頻道。

- [ ] **步驟 1：加入 Cloud Build 設定**

建立 `cloudbuild.yaml`，內容如下：

```yaml
serviceAccount: projects/echotrail-dev-508500-k6/serviceAccounts/echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com

options:
  logging: CLOUD_LOGGING_ONLY

steps:
  - name: node:24.12.0
    entrypoint: npm
    args: [ci]

  - name: node:24.12.0
    entrypoint: npm
    args: [run, lint]

  - name: node:24.12.0
    entrypoint: npm
    args: [run, type-check]

  - name: node:24.12.0
    entrypoint: npm
    args: [run, format:check]

  - name: node:24.12.0
    entrypoint: npm
    args: [test]

  - name: node:24.12.0
    entrypoint: npm
    args: [run, build]

  - name: node:24.12.0
    entrypoint: npx
    args:
      - --yes
      - firebase-tools@15.30.0
      - deploy
      - --only
      - hosting
      - --project
      - echotrail-dev-508500-k6
      - --non-interactive
      - --message
      - frontend-$COMMIT_SHA
```

- [ ] **步驟 2：驗證可在本機重現的步驟**

執行：

```sh
npm ci
npm run lint
npm run type-check
npm run format:check
npm test
npm run build
npx --yes firebase-tools@15.30.0 --version
```

預期：所有品質檢查指令以狀態碼 0 結束；最後一個指令輸出 `15.30.0`。不要在本機執行 `firebase deploy`。

- [ ] **步驟 3：檢查部署流程的安全邊界**

提交前確認 `cloudbuild.yaml` 包含以下內容：

```text
serviceAccount: ...echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com
logging: CLOUD_LOGGING_ONLY
--only hosting
--non-interactive
```

預期：流程只部署 Hosting，不含個人 token 或 JSON key，也不部署或變更 Cloud Run。

- [ ] **步驟 4：提交部署流程**

```sh
git add cloudbuild.yaml
git commit -m "build: deploy frontend with Cloud Build"
```

## 任務 3：記錄部署架構與操作指南

**檔案：**

- 新增：`docs/cloud-architecture.md`
- 修改：`docs/frontend-architecture.md`
- 修改：`README.md`

**介面：**

- 使用：已採納的 ADR、`firebase.json`、`cloudbuild.yaml` 與既有後端 Cloud Run 架構。
- 提供：標明專案、服務帳號、trigger、驗證 URL 與回滾動作的操作指南。

- [ ] **步驟 1：建立 `docs/cloud-architecture.md`**

以直接的繁體中文撰寫以下章節：

```markdown
# EchoTrail 前端雲端架構

## 架構總覽

GitHub 的 dev 分支
        ↓
Cloud Build（echotrail-frontend-deployer）
        ↓
Firebase Hosting
        ├─ 靜態檔案與 Vue SPA 路由
        └─ /api/** → Cloud Run：echotrail-backend（asia-east1）

## 存取邊界

瀏覽器以同一個 Firebase Hosting 網址取得靜態檔案與 `/api/...`。
Firebase Hosting 將 `/api/...` 轉送到 Cloud Run。瀏覽器不會對這個同源請求執行 CORS 檢查。
Cloud Run 目前允許未驗證請求。它的直接網址不是秘密。

## 部署後驗證

1. Cloud Build 的 npm quality gate、build 與 Firebase Hosting deploy 都成功。
2. `https://echotrail-dev-508500-k6.web.app/`、`/trail` 與 `/dashboard` 都回傳前端應用程式。
3. Cloud Run Console 顯示的 `echotrail-backend` service URL 加上 `/health` 後，回傳 HTTP 200 與 `{"status":"ok"}`。
4. 第一支 `/api/...` 路由完成後，再驗證 `https://echotrail-dev-508500-k6.web.app/api/...` 回傳後端預期結果，而不是 `index.html`。
```

加入只使用 Console 的設定章節，依序執行：

1. 將 Firebase 加入 GCP 專案 `echotrail-dev-508500-k6`，再啟用 Firebase Hosting。
2. 建立 `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`。
3. 在同一專案授予該服務帳號 `Firebase Hosting Admin`、`API Keys Viewer`、`Cloud Build Service Account` 與 `Logs Writer`。
4. 將前端 GitHub repository 連接 Cloud Build。建立符合 `^dev$`、使用 `cloudbuild.yaml` 且以 `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com` 執行的 trigger。
5. 在 Firebase Hosting 記下產生的 `*.web.app` URL。不建立預覽頻道、自訂網域、正式網站、服務帳號金鑰或個人 CLI token。

加入回滾章節：在 Firebase Console 選取先前的 Hosting release 並回滾。說明此動作不會改變獨立部署的 Cloud Run revision。

- [ ] **步驟 2：更新既有前端架構文件**

在 `docs/frontend-architecture.md` 第 6 節，將正式部署的保留說明替換為已採納的契約：

```markdown
正式前端產物部署至 Firebase Hosting。Hosting 將 `/api/**` 轉送到 `asia-east1` 的 `echotrail-backend` Cloud Run service；其他不存在的前端路徑回傳 `index.html`。
前端維持 `VITE_API_BASE_URL=/api`。Vite proxy 只用於本機開發。
```

保留「repository 內既有 Gemini server 並非正式後端」的敘述。

- [ ] **步驟 3：更新 README**

在 `## 分支規範` 後新增 `## 部署` 章節：

```markdown
`dev` 分支的前端變更由 Cloud Build 執行品質檢查、Vite build 與 Firebase Hosting deploy。正式網站使用 `/api` 呼叫後端；Firebase Hosting 會將該路徑轉送到 Cloud Run。

部署設定與 Console 操作方式見 [前端雲端架構](../../cloud-architecture.md)。不要從本機執行 `firebase deploy`，也不要建立或提交 Firebase token 或服務帳號 JSON key。
```

- [ ] **步驟 4：驗證文件與本機建置**

執行：

```sh
git diff --check
npm run lint
npm run type-check
npm run format:check
npm test
npm run build
```

預期：文件沒有空白格式錯誤，所有品質檢查指令都以狀態碼 0 結束；各文件的專案 ID、Cloud Run 服務、區域、分支及 `/api` 路徑須一致。

- [ ] **步驟 5：提交操作文件**

```sh
git add README.md docs/cloud-architecture.md docs/frontend-architecture.md
git commit -m "docs: describe frontend Firebase deployment"
```

## 任務 4：建立 dev Hosting 網站並驗證首次部署

**檔案：**

- 修改：無 repository 檔案
- 驗證：Firebase Console、Cloud Build Console、Firebase Hosting URL、Cloud Run URL

**介面：**

- 使用：已合併的任務 1–3、既有公開 `echotrail-backend` Cloud Run 服務及公司管理的 GCP 專案。
- 提供：只有前端 `dev` trigger 會部署正式頻道的 Firebase Hosting dev 網站。

- [ ] **步驟 1：觸發部署前確認 Console 前置條件**

在 Google Cloud Console 與 Firebase Console 確認以下項目：

```text
已將 Firebase 加入 echotrail-dev-508500-k6。
已啟用 Firebase Hosting。
echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com 已存在。
該服務帳號具備 Firebase Hosting Admin、API Keys Viewer、Cloud Build Service Account 與 Logs Writer。
Cloud Build trigger 指向前端 repository、^dev$ 分支及 cloudbuild.yaml。
Trigger 以 echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com 執行。
```

預期：所有前置條件都可在 Console 看見。若操作人員因缺少 `iam.serviceAccounts.actAs` 而無法建立 trigger，須申請該部署服務帳號的 `Service Account User`；不得以個人帳號或金鑰繞過。

- [ ] **步驟 2：從 Cloud Build Console 執行 trigger**

在前端 trigger 上以目前的 `dev` commit 執行 **Run trigger**。

預期：`npm ci`、lint、type-check、format check、測試、Vite build 與 `firebase deploy --only hosting` 全部成功。Firebase Hosting 部署輸出包含產生的 `*.web.app` URL。

- [ ] **步驟 3：驗證已部署的 Vue 應用程式**

在乾淨的瀏覽器工作階段開啟以下三個 URL：

```text
https://echotrail-dev-508500-k6.web.app/
https://echotrail-dev-508500-k6.web.app/trail
https://echotrail-dev-508500-k6.web.app/dashboard
```

預期：三個 URL 都載入 Vue 應用程式；`/trail` 與 `/dashboard` 不應顯示 Firebase 404 頁。

- [ ] **步驟 4：驗證目前的後端邊界**

開啟以下 URL：

```text
Cloud Run Console 顯示的 echotrail-backend service URL，加上 /health
```

預期：HTTP 200 與 `{"status":"ok"}`。`https://echotrail-dev-508500-k6.web.app/health` 並非有效檢查路徑，因為 Hosting 只轉送 `/api/**`。

- [ ] **步驟 5：將 API rewrite 驗證標記為等待後端契約**

不要只為測試基礎設施而新增暫時性 API 路由；既有後端尚無 `/api/...` 路由。

預期：後端完成第一支 `/api/...` 路由後，開啟對應的 Firebase Hosting `/api/...` URL，確認回傳後端結果，而不是 SPA HTML。屆時把結果加入部署紀錄。

- [ ] **步驟 6：測試 Hosting 回滾路徑**

在 Firebase Console 找出前一個 Hosting release。除非有安全的前一版本且操作人員同意暫時變更，否則不要只為此測試回滾正式網站。記錄 **Rollback** 控制項位置，並確認它只影響 Hosting。

預期：已準備好文件化的回滾程序。Hosting 回滾不改變 Cloud Run revision。

## 計畫自我檢查

- **規格涵蓋：** 任務 1 實作 `/api` 轉送、SPA 備援、快取規則、固定前端 API base URL 與設定回歸測試；任務 2 實作專用 Cloud Build 部署身分與無金鑰 CI 部署；任務 3 記錄僅限 dev 的操作、公開 Cloud Run 邊界、驗證及回滾；任務 4 完成已核准的 Console 設定，並在不虛構產品 API 的情況下驗證首次部署。
- **佔位內容檢查：** 沒有 `TODO`、`TBD` 或未指明的檔案、指令、服務名稱、專案 ID、區域、角色、URL 或預期結果。
- **一致性：** 所有任務沿用 `echotrail-dev-508500-k6`、`echotrail-backend`、`asia-east1`、`dev`、`/api`、`VITE_API_BASE_URL=/api` 與 `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`。
