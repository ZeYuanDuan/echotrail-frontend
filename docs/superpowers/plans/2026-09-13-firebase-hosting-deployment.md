# Firebase Hosting Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Vue/Vite `dist/` output from `dev` to Firebase Hosting, and forward same-origin `/api/...` requests to the existing Cloud Run backend.

**Architecture:** Firebase Hosting serves static files and the Vue history-router fallback. Its first rewrite forwards `/api` and `/api/**` unchanged to `echotrail-backend` in `asia-east1`; the catch-all rewrite then returns `index.html`. A dedicated Cloud Build service account runs the frontend trigger, performs local quality checks, builds `dist/`, and deploys only Firebase Hosting by using Application Default Credentials.

**Tech Stack:** Vue 3, Vite 8, Vitest 4, Firebase Hosting, Firebase CLI 15.30.0, Cloud Build, Cloud Run.

**Spec:** `docs/adr/0001-firebase-hosting-deployment-decisions.md`

## Global Constraints

- Target project: `echotrail-dev-508500-k6`.
- Target Cloud Run service: `echotrail-backend` in `asia-east1`.
- Deploy only from the frontend repository's `dev` branch. Do not create a PR preview channel.
- Keep `VITE_API_BASE_URL=/api`. Do not put Cloud Run URLs, LLM keys, tokens, or service-account credentials in frontend source or `VITE_*` variables.
- Public product routes use `/api/...`. Keep `GET /health` as a direct Cloud Run maintenance endpoint.
- Cloud Run remains publicly invokable for this milestone. Do not add user authentication, API Gateway, a load balancer, a database, or production resources.
- Use the Firebase CLI's Application Default Credentials in Cloud Build. Do not use `firebase login`, a personal token, or a service-account JSON key.
- Use `npm`, `package-lock.json`, Node.js 24, `npm run lint`, `npm run type-check`, `npm run format:check`, `npm test`, and `npm run build`.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `firebase.json` | Defines `dist/` as the Hosting root, cache headers, the Cloud Run API rewrite, and the Vue SPA fallback. |
| `.firebaserc` | Associates this repository's default Firebase alias with `echotrail-dev-508500-k6`. |
| `.gitignore` | Excludes Firebase CLI's local `.firebase/` cache. |
| `src/__tests__/firebase-hosting-config.spec.ts` | Prevents accidental changes to the Hosting public directory, rewrite order, Cloud Run target, and cache headers. |
| `cloudbuild.yaml` | Runs the frontend quality gate and deploys Hosting from Cloud Build using the dedicated service account. |
| `docs/cloud-architecture.md` | Records the frontend deployment flow, security boundary, Console setup, verification, and rollback procedure. |
| `docs/frontend-architecture.md` | Replaces the former “formal deployment still needs configuration” statement with the accepted Hosting architecture. |
| `README.md` | Gives developers the short deployment contract and links to the operational architecture document. |

## Task 1: Add the Firebase Hosting contract and its regression test

**Files:**

- Create: `firebase.json`
- Create: `.firebaserc`
- Modify: `.gitignore`
- Create: `src/__tests__/firebase-hosting-config.spec.ts`

**Interfaces:**

- Consumes: Vite's generated `dist/` directory and the existing Cloud Run service `echotrail-backend` in `asia-east1`.
- Produces: a Hosting configuration with these rewrite rules, in this order: `/api{,/**}` to Cloud Run, then `**` to `/index.html`.

- [ ] **Step 1: Write the failing Hosting configuration test**

Create `src/__tests__/firebase-hosting-config.spec.ts` with this content:

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

- [ ] **Step 2: Run the test to verify it fails**

Run:

```sh
npm test -- src/__tests__/firebase-hosting-config.spec.ts
```

Expected: FAIL because `firebase.json` does not exist.

- [ ] **Step 3: Add the Firebase project and Hosting configuration**

Create `.firebaserc`:

```json
{
  "projects": {
    "default": "echotrail-dev-508500-k6"
  }
}
```

Create `firebase.json`:

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

Append this line to `.gitignore`:

```gitignore
.firebase/
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```sh
npm test -- src/__tests__/firebase-hosting-config.spec.ts
```

Expected: PASS with 2 tests.

- [ ] **Step 5: Run the complete local quality gate**

Run:

```sh
npm run lint
npm run type-check
npm run format:check
npm test
npm run build
```

Expected: every command exits with status 0, and `npm run build` writes `dist/`.

- [ ] **Step 6: Commit the Hosting contract**

```sh
git add .firebaserc .gitignore firebase.json src/__tests__/firebase-hosting-config.spec.ts
git commit -m "build: configure Firebase Hosting"
```

## Task 2: Add the frontend Cloud Build deployment pipeline

**Files:**

- Create: `cloudbuild.yaml`

**Interfaces:**

- Consumes: `package-lock.json`, `firebase.json`, `.firebaserc`, the `dist/` output, and ADC from `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`.
- Produces: a Firebase Hosting live-channel deployment to `echotrail-dev-508500-k6` after the frontend quality gate succeeds.

- [ ] **Step 1: Add the Cloud Build configuration**

Create `cloudbuild.yaml` with this content:

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

- [ ] **Step 2: Verify the locally reproducible steps**

Run:

```sh
npm ci
npm run lint
npm run type-check
npm run format:check
npm test
npm run build
npx --yes firebase-tools@15.30.0 --version
```

Expected: all quality commands exit with status 0; the final command prints `15.30.0`. Do not run `firebase deploy` locally.

- [ ] **Step 3: Inspect the pipeline for the required security boundary**

Verify that `cloudbuild.yaml` contains all of the following before committing:

```text
serviceAccount: ...echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com
logging: CLOUD_LOGGING_ONLY
--only hosting
--non-interactive
```

Expected: the pipeline deploys only Hosting, has no personal token or JSON key, and does not deploy or change Cloud Run.

- [ ] **Step 4: Commit the deployment pipeline**

```sh
git add cloudbuild.yaml
git commit -m "build: deploy frontend with Cloud Build"
```

## Task 3: Document the deployment architecture and operator runbook

**Files:**

- Create: `docs/cloud-architecture.md`
- Modify: `docs/frontend-architecture.md`
- Modify: `README.md`

**Interfaces:**

- Consumes: the accepted ADR, `firebase.json`, `cloudbuild.yaml`, and the existing backend Cloud Run architecture.
- Produces: one operator-facing deployment procedure that names the project, service account, trigger, verification URLs, and rollback action.

- [ ] **Step 1: Create `docs/cloud-architecture.md`**

Write these sections in direct Traditional Chinese:

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

Add a Console-only setup section with these exact actions:

1. Add Firebase to GCP project `echotrail-dev-508500-k6`, then enable Firebase Hosting.
2. Create `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`.
3. Grant this service account `Firebase Hosting Admin`, `API Keys Viewer`, `Cloud Build Service Account`, and `Logs Writer` in the same project.
4. Connect the frontend GitHub repository to Cloud Build. Create a trigger that matches `^dev$`, uses `cloudbuild.yaml`, and executes as `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`.
5. In Firebase Hosting, record the generated `*.web.app` URL. Do not create a preview channel, custom domain, production site, service-account key, or personal CLI token.

Add a rollback section: select the previous Firebase Hosting release in the Firebase console and roll it back. State that this rollback does not change the independently deployed Cloud Run revision.

- [ ] **Step 2: Update the existing frontend architecture document**

In `docs/frontend-architecture.md`, replace the formal-deployment caveat in section 6 with the accepted contract:

```markdown
正式前端產物部署至 Firebase Hosting。Hosting 將 `/api/**` 轉送到 `asia-east1` 的 `echotrail-backend` Cloud Run service；其他不存在的前端路徑回傳 `index.html`。
前端維持 `VITE_API_BASE_URL=/api`。Vite proxy 只用於本機開發。
```

Keep the statement that the current repository-local Gemini server is not the formal backend.

- [ ] **Step 3: Update the README**

Add a `## 部署` section after `## 分支規範`:

```markdown
`dev` 分支的前端變更由 Cloud Build 執行品質檢查、Vite build 與 Firebase Hosting deploy。正式網站使用 `/api` 呼叫後端；Firebase Hosting 會將該路徑轉送到 Cloud Run。

部署設定與 Console 操作方式見 [前端雲端架構](docs/cloud-architecture.md)。不要從本機執行 `firebase deploy`，也不要建立或提交 Firebase token 或服務帳號 JSON key。
```

- [ ] **Step 4: Verify the documents and local build**

Run:

```sh
git diff --check
npm run lint
npm run type-check
npm run format:check
npm test
npm run build
```

Expected: the documentation has no whitespace errors, every quality command exits with status 0, and the documents agree on the same project ID, Cloud Run service, region, branch, and `/api` path.

- [ ] **Step 5: Commit the operator documentation**

```sh
git add README.md docs/cloud-architecture.md docs/frontend-architecture.md
git commit -m "docs: describe frontend Firebase deployment"
```

## Task 4: Provision the dev Hosting site and verify the first deployment

**Files:**

- Modify: no repository files
- Verify: Firebase Console, Cloud Build Console, Firebase Hosting URL, Cloud Run URL

**Interfaces:**

- Consumes: merged Tasks 1–3, the existing public `echotrail-backend` Cloud Run service, and the company-managed GCP project.
- Produces: a single Firebase Hosting dev site whose live channel is deployed only by the frontend `dev` trigger.

- [ ] **Step 1: Confirm Console prerequisites before triggering a deployment**

In Google Cloud Console and Firebase Console, verify all of the following:

```text
Firebase is added to echotrail-dev-508500-k6.
Firebase Hosting is enabled.
echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com exists.
The service account has Firebase Hosting Admin, API Keys Viewer, Cloud Build Service Account, and Logs Writer.
The Cloud Build trigger targets the frontend repository, branch ^dev$, and cloudbuild.yaml.
The trigger executes as echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com.
```

Expected: every prerequisite is visible in the Console. If the trigger cannot be created because the operator lacks `iam.serviceAccounts.actAs`, request `Service Account User` on the deployer service account. Do not use a personal account or key as a workaround.

- [ ] **Step 2: Run the trigger from the Cloud Build Console**

Use **Run trigger** for the frontend trigger on the current `dev` commit.

Expected: `npm ci`, lint, type-check, format check, tests, Vite build, and `firebase deploy --only hosting` all succeed. The Firebase Hosting deploy output includes the generated `*.web.app` URL.

- [ ] **Step 3: Verify the deployed Vue application**

Open these three URLs in a clean browser session:

```text
https://echotrail-dev-508500-k6.web.app/
https://echotrail-dev-508500-k6.web.app/trail
https://echotrail-dev-508500-k6.web.app/dashboard
```

Expected: each URL loads the Vue application. `/trail` and `/dashboard` must not return a Firebase 404 page.

- [ ] **Step 4: Verify the current backend boundary**

Open this URL:

```text
Cloud Run Console 顯示的 echotrail-backend service URL，加上 /health
```

Expected: HTTP 200 and `{"status":"ok"}`. Do not treat `https://echotrail-dev-508500-k6.web.app/health` as a valid check because Hosting only forwards `/api/**`.

- [ ] **Step 5: Record the API-rewrite verification as blocked by the backend contract**

Do not add a temporary API route solely for infrastructure testing. The existing backend has no `/api/...` route.

Expected: after the backend implements its first `/api/...` route, open the matching Firebase Hosting `/api/...` URL and confirm that it returns the backend response rather than the SPA HTML. Add this result to the deployment record at that time.

- [ ] **Step 6: Test the Hosting rollback path**

In Firebase Console, identify the previous Hosting release. Do not roll back the live site solely for this test unless a safe prior release exists and the operator approves the temporary change. Record where the **Rollback** control is located and confirm that it changes only Hosting.

Expected: the documented rollback procedure is ready. Cloud Run revisions remain unchanged by a Hosting rollback.

## Plan Self-Review

- Spec coverage: Task 1 implements `/api` forwarding, SPA fallback, cache policy, fixed frontend API base URL, and configuration regression tests. Task 2 implements the dedicated Cloud Build deployer and no-key CI deployment. Task 3 records the dev-only operation, public Cloud Run boundary, validation, and rollback. Task 4 performs the approved Console setup and verifies the first deployment without inventing a product API.
- Placeholder scan: no `TODO`, `TBD`, or unspecified files, commands, service names, project IDs, regions, roles, URLs, or expected outcomes remain.
- Consistency: every task uses `echotrail-dev-508500-k6`, `echotrail-backend`, `asia-east1`, `dev`, `/api`, `VITE_API_BASE_URL=/api`, and `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`.
