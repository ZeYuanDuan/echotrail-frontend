# EchoTrail 前端雲端架構

## 架構總覽

```text
GitHub 的 dev 分支
        ↓
Cloud Build（echotrail-frontend-deployer）
        ↓
Firebase Hosting
        ├─ 靜態檔案與 Vue SPA 路由
        └─ /api/** → Cloud Run：echotrail-backend（asia-east1）
```

## 存取邊界

瀏覽器以同一個 Firebase Hosting 網址取得靜態檔案與 `/api/...`。
Firebase Hosting 將 `/api/...` 轉送到 Cloud Run。瀏覽器不會對這個同源請求執行 CORS 檢查。
Cloud Run 目前允許未驗證請求。它的直接網址不是秘密。

## Console-only 設定

1. 將 Firebase 加入 GCP 專案 `echotrail-dev-508500-k6`，然後啟用 Firebase Hosting。
2. 建立 `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com`。
3. 在同一個專案中授予這個 service account `Firebase Hosting Admin`、`API Keys Viewer`、`Cloud Build Service Account` 與 `Logs Writer`。
4. 將前端 GitHub repository 連接至 Cloud Build。建立符合 `^dev$`、使用 `cloudbuild.yaml`，並以 `echotrail-frontend-deployer@echotrail-dev-508500-k6.iam.gserviceaccount.com` 執行的 trigger。
5. 在 Firebase Hosting 中記錄產生的 `*.web.app` URL。不要建立 preview channel、custom domain、production site、service-account key 或 personal CLI token。

## 部署後驗證

1. Cloud Build 的 npm quality gate、build 與 Firebase Hosting deploy 都成功。
2. `https://echotrail-dev-508500-k6.web.app/`、`/trail` 與 `/dashboard` 都回傳前端應用程式。
3. Cloud Run Console 顯示的 `echotrail-backend` service URL 加上 `/health` 後，回傳 HTTP 200 與 `{"status":"ok"}`。
4. 第一支 `/api/...` 路由完成後，再驗證 `https://echotrail-dev-508500-k6.web.app/api/...` 回傳後端預期結果，而不是 `index.html`。

## 回滾

在 Firebase console 選取前一個 Firebase Hosting release 並回滾。這項回滾不會變更獨立部署的 Cloud Run revision。
