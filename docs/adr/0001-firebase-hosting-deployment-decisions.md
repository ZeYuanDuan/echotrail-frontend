# ADR 0001：Firebase Hosting 部署前的待決事項

- 狀態：Accepted
- 日期：2026-09-13
- 需要決定的人：EchoTrail 團隊

## 你需要做什麼

所有首次部署所需的架構決策已確認。本文件的「延後決定的事項」不阻礙 Firebase Hosting 首次部署。

## 已確認的事實

- 前端是 Vue/Vite 單頁應用。`npm run build` 會產生 `dist/`。
- 前端路由使用 history mode。因此直接開啟 `/trail` 或 `/dashboard` 時，Firebase Hosting 必須回傳 `index.html`。
- 前端目前以 `/api` 呼叫後端。本機 Vite 會把 `/api` 轉送到本機服務。這個轉送規則不會出現在正式 `dist/`。
- 後端服務名稱是 `echotrail-backend`。它位於 `echotrail-dev-508500-k6` 的 `asia-east1`。`dev` 分支目前會觸發 Cloud Build 部署後端。
- 後端目前只有公開 `GET /health`。產品 API、帳號和資料庫都尚未建立。

## 名詞

- **Firebase Hosting rewrite：** Firebase Hosting 收到指定路徑後，將請求轉送到 Cloud Run。
- **PR preview：** Pull Request 的暫時預覽網址。知道網址的人可以開啟它。
- **產品 API：** 日後提供前端功能的 `/api/...` 路由。它不包含目前的 `/health` 維運端點。

## Q01：要建立幾個前端環境？

**已決定：A。** 只建立一個 `dev` 網站。不建立 Pull Request 預覽網址。

| 選項 | 做法 | 適合情況 | 代價 |
| --- | --- | --- | --- |
| A（已選） | 只建立一個 `dev` 網站。 | 團隊不需要 PR 預覽。 | 每次審查都要自己在本機驗證。 |
| B | 建立一個 `dev` 網站。每個 Pull Request 建立暫時預覽網址。 | 目前要加快審查，但還不需要 production。 | 預覽網站會呼叫 `dev` 後端。不可把它當成隔離環境。 |
| C | 一開始建立 dev、staging、production 三套網站和後端。 | 已經需要對外發布或資料隔離。 | 要同時維護三套設定和資源。 |

## Q02：前端要怎麼呼叫 Cloud Run？

**已決定：A。** 前端繼續呼叫 `/api`。Firebase Hosting 將 `/api/**` 轉送到 Cloud Run。前端不需要知道 Cloud Run URL，也不需要處理 CORS。

| 選項 | 做法 | 優點 | 代價 |
| --- | --- | --- | --- |
| A（已選） | Firebase Hosting 將 `/api/**` 轉送到 `echotrail-backend`。 | 前端使用 `/api`。 | Cloud Run 不是私有服務。不能只靠 Hosting 保護 API。 |
| B | 前端直接呼叫 Cloud Run URL。後端設定 CORS。 | 不需要 Hosting API 轉送規則。 | 每個環境都要管理 API URL、CORS origin 和 `OPTIONS` 請求。 |
| C | 先建立 API Gateway 或負載平衡層，再轉送 Cloud Run。 | 可集中管理驗證、配額和 WAF。 | 第一支產品 API 前就增加資源、費用和維運工作。 |

## Q03：產品 API 的路徑要長什麼樣子？

**已決定：A。** 後端原生提供 `/api/...`。Firebase Hosting 只轉送路徑，不修改路徑。

| 選項 | 做法 | 優點 | 代價 |
| --- | --- | --- | --- |
| A（已選） | 產品 API 使用 `/api/...`。`/health` 繼續是 Cloud Run 維運端點。 | 本機、Firebase Hosting 和 Cloud Run 的 API 路徑一致。 | 新增後端路由時，要遵守 `/api` 前綴。 |
| B | 前端送 `/api/...`，再額外移除 `/api` 後才交給後端。 | 可沿用沒有前綴的舊路由。 | Firebase Hosting 不會自動移除前綴。需要長期維護額外 proxy。 |
| C | 前端不用 `/api`，改用完整 Cloud Run URL。 | 路由看起來較短。 | 會回到 Q02-B 的 CORS 和環境 URL 問題。 |

## Q04：Cloud Run 現在要公開還是私有？

**已決定：A。** 在第一支產品 API 出現前，維持 Cloud Run 可被未驗證請求呼叫。產品 API 建立時，再設計使用者認證、授權和防濫用規則。

| 選項 | 做法 | 適合情況 | 代價 |
| --- | --- | --- | --- |
| A（已選） | Cloud Run 接受未驗證請求。產品 API 自己驗證使用者。 | 目前只有公開 `/health`，且第一支 API 不處理敏感資料。 | Cloud Run URL 不能視為秘密。產品 API 必須驗證輸入和使用者。 |
| B | Cloud Run 只接受 IAM 驗證。另建 BFF、IAP 或其他受信任服務。 | 已有企業 SSO 或內部系統要求。 | 純靜態前端不能直接呼叫 API。必須先完成代理和 session 設計。 |
| C | API Gateway 或 WAF 對外。Cloud Run 放在它後面。 | 已知有外部 API、濫用或合規要求。 | 要先建立並維護額外服務。 |

## Q05：誰要負責部署 Firebase Hosting？

**已決定：A。** 前端使用專用 Cloud Build trigger。它在 `dev` 分支執行前端測試、build 和 Firebase Hosting deploy。

| 選項 | 做法 | 優點 | 代價 |
| --- | --- | --- | --- |
| A（已選） | Cloud Build 執行測試、build 和 Firebase Hosting deploy。 | 和既有後端流程一致。GCP 集中管理記錄與 IAM。 | Cloud Build 服務帳號要有 Firebase Hosting deploy 權限。 |
| B | 使用 Firebase 提供的 GitHub Action。 | Pull Request preview 設定最快。 | 預設流程會把服務帳號 JSON key 存到 GitHub secret。 |
| C | 自建 GitHub Actions，使用 OIDC 與短期 GCP 憑證。 | 不需要長期 JSON key。 | 初次設定 Workload Identity Federation 較複雜。 |

## Q06：前端建置時要放什麼 API 設定？

**已決定：A。** `VITE_API_BASE_URL` 固定為 `/api`。不要把 Cloud Run URL、LLM key 或服務帳號資料放進前端產物。

| 選項 | 做法 | 優點 | 代價 |
| --- | --- | --- | --- |
| A（已選） | 每個網站都使用 `/api`。Firebase Hosting 決定實際 Cloud Run 服務。 | 前端設定最少。沒有 CORS 問題。 | 每個網站都必須有正確的 `/api` rewrite。 |
| B | CI 在 build 時放入各環境的 Cloud Run URL。 | 不需要 `/api` rewrite。 | URL 會出現在前端產物。還要處理 CORS。 |
| C | 前端啟動時讀取公開 `config.json`。 | 同一份 bundle 可部署到多個環境。 | 要處理設定檔快取、載入失敗和版本一致性。 |

## Q07：第一次部署必須包含哪些保護？

**已決定：A。** 首次部署就設定路由、快取、驗證和回滾。這些是 Vue 單頁應用能正常運作的基本條件。

| 選項 | 做法 | 結果 |
| --- | --- | --- |
| A（已選） | `/api/**` 先轉送 Cloud Run。其他找不到的路徑回傳 `index.html`。有 hash 的 Vite assets 使用長快取。部署後檢查首頁、`/trail`、`/dashboard`、Cloud Run 的 `/health` 和第一支產品 API。失敗時回復上一個 Hosting release。 | 可驗證 SPA 路由、API 轉送和更新後的資產是否正常。 |
| B | 只上傳 `dist/`。不設定 rewrite、快取或自動檢查。 | `/trail` 和 `/dashboard` 會無法直接開啟。`/api` 也不會到 Cloud Run。 |
| C | 每個 Firebase Hosting release 都固定使用一個 Cloud Run revision。 | 前後端版本綁得更緊，但兩個 repository 需要同步發布和回滾。 |

## 已選決策的實作細節

下列項目不需要再做架構選擇。實作時會採用這些預設值。

- Firebase Hosting 使用目前 GCP/Firebase project 的單一 dev site。
- 前端 Cloud Build trigger 只在 `dev` 分支部署 live site。
- Cloud Build 使用專用服務帳號。該帳號需要 Firebase Hosting deploy 權限和 API Keys Viewer 權限。
- `/health` 是 Cloud Run 的直接維運檢查，不會由 `/api/**` rewrite 處理。
- 第一支產品 API 完成後，部署 smoke test 才會再驗證 `/api/...`。

## 延後決定的事項

下列事項不會阻礙 Firebase Hosting 的首次部署，但不能省略。

- 第一支產品 API 上線前，必須決定使用者認證、授權、輸入限制和 LLM 成本保護。Cloud Run 目前接受公開請求，因此任何人都能嘗試呼叫產品 API。
- 要建立 production 網站或自訂網域時，必須另行決定 production project、Hosting site、Cloud Run service 與部署分支。

## 來源

- [Firebase Hosting rewrites](https://firebase.google.com/docs/hosting/full-config)：rewrite 的順序、SPA fallback、Cloud Run 轉送與原始路徑行為。
- [Firebase Hosting preview channels](https://firebase.google.com/docs/hosting/test-preview-deploy)：preview URL 與 live channel 的行為。
- [Cloud Run public access](https://cloud.google.com/run/docs/authenticating/public)：公開 Cloud Run 的 IAM 行為。
- [Firebase CLI in CI](https://firebase.google.com/docs/cli)：Firebase CLI 在 CI 使用 Application Default Credentials 的建議。
- [Firebase IAM roles](https://firebase.google.com/docs/projects/iam/roles-predefined-product)：Firebase Hosting deploy 所需角色資訊。
