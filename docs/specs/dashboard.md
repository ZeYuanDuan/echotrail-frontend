# Dashboard 已保存快照

Dashboard 由使用者明確按「更新至 Dashboard」後重算。後端依該 `userId` 讀取**全部**已確認事件洞見和訊號，產生整體 Persona、共鳴之錨、關鍵字、行為模式、北極星與框架訊號預覽，原子保存為一筆 `dashboard_runs`。確認 Echo Card 不會自動重算；重算失敗或來源版本衝突時，前一個成功快照仍可讀。

前端 Dashboard 頁只呼叫 `GET /api/dashboard?userId=<uuid>`。回傳 `null` 時顯示空狀態；載入失敗顯示重試。Persona、文字、框架分數與證據均取自同一個 `DashboardSnapshot`，不從瀏覽器事件資料推算。重新載入會再次 GET；切換暱稱會先清空舊快照。

`frameworks.scores` 包含 RIASEC、DISC、Schein 的完整維度；沒有訊號的維度為 0。`frameworks.evidence` 保留事件 ID、標題、維度、強度與逐字原句。當前平均強度乘 10 的分數只是**事件訊號預覽**，C-7～C-9 最終計分另案處理。DISC 位置及圖表長度是純呈現計算。
