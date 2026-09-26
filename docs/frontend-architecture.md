# EchoTrail 前端架構

前端使用 Vue 3、TypeScript、Vue Router 與 Axios。正式流程先用暱稱向後端查找展示使用者，再由後端持有已確認事件與 Dashboard 快照。暱稱不是登入驗證；這個切片只供工程展示。

## 資料流

```text
暱稱 → POST /api/users → 穩定 userId
聊天 → POST /api/llm/chat → 暫存於記憶體
Generate Insight → POST /api/llm/insight → 未儲存預覽
確認 Echo Card → POST /api/events → PostgreSQL event + insight + 訊號 → 自動重算 Dashboard
My Trail → GET /api/events?userId=... → 所有已確認事件
更新至 Dashboard → POST /api/dashboard/rebuild → 完整快照
Dashboard → GET /api/dashboard?userId=... → 最新成功快照
```

`src/lib/api.ts` 是共用 Axios instance；`src/lib/persistence.ts` 集中定義持久化型別與五個 API 呼叫。`src/composables/useIdentity.ts` 在 `echotrail-user-v1` 中只保存 `{id,name}`，重新載入時再次向後端查找暱稱。切換使用者會立即清除對話、卡片、Trail 與 Dashboard 狀態，並使舊請求的回應失效。`useEcho.ts` 只保存當次對話、草稿和未確認預覽；正式事件不寫入瀏覽器 localStorage。

一段對話最多確認一張卡片。確認後該對話結束，首頁隱藏輸入框與後續腳本，只提供「開啟新對話」；此操作與側欄 `+New` 都會清空當次狀態並建立新的 `conversationId`。產卡與確認只送目前對話片段。確認請求以預覽建立時的 `clientEventId` 作冪等鍵；第一次送出時凍結 payload，回應結果不明時重試相同內容。只有明確 400 驗證錯誤才解除凍結，讓使用者修正卡片。

`src/composables/useTrail.ts` 依使用者載入全部事件，保留後端 `createdAt,id` 排序。建立時間只用於顯示，不能從事件文字推日期。`src/composables/useDashboard.ts` 只載入已保存快照；首頁確認卡片成功後會立即觸發重算，成功後才跳轉。My Trail 的獨立按鈕保留為失敗或中斷後的重試入口。頁面圖表只計算 CSS 長度和位置，不在瀏覽器重新聚合分數。框架分數是事件訊號預覽，非產品最終計分。
若確認卡片後自動重算失敗、離開或重新載入，My Trail 的「更新至 Dashboard」仍可對所有已確認事件執行重算。重算進行中若先打開 Dashboard，成功的重算結果會取代稍早讀到的舊快照。

## 路由與狀態

| 路由 | 資料來源 | 空狀態 |
| --- | --- | --- |
| `/` | 當次聊天與未確認卡片預覽 | 對話起始畫面 |
| `/trail` | `GET /api/events` | 尚無已確認事件 |
| `/dashboard/:section?` | `GET /api/dashboard` | 尚無成功重算的快照 |

所有非同步流程顯示載入與錯誤狀態，並阻止重複送出。Trail 與 Dashboard 在使用者切換後先清空，再讀取新使用者資料；舊回應不得蓋回。`src/mocks/echo.ts` 中的歷史示範事件不會出現在正式 Trail 或 Dashboard。

## 部署

`VITE_API_BASE_URL` 預設為 `/api`。本機 Vite proxy 將 API 導向獨立後端；Firebase Hosting 正式部署以 `/api/**` rewrite 導向 Cloud Run。`VITE_*` 會進入公開 bundle，Gemini 金鑰與資料庫密碼只存在後端。前端在 `dev` 經 Cloud Build 驗證與部署；合併前執行 `npm test`、`npm run lint`、`npm run type-check`、`npm run format:check`、`npm run build`。
