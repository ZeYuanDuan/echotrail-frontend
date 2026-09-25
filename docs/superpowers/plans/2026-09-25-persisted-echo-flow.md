# Echo 持久化流程實作計畫

> **供實作代理參考：** 必須使用 superpowers:subagent-driven-development（建議）或 superpowers:executing-plans，依序完成本計畫各任務。步驟以核取方塊（`- [ ]`）追蹤。

**目標：** 讓輸入暱稱的展示使用者確認 Echo Card 後立即在 My Trail 看見事件，明確觸發 Dashboard 全量重算，並在重新載入後從 PostgreSQL 後端讀回兩個頁面的資料。

**架構：** Vue 只保留尚未確認的對話與卡片草稿；已確認的事件及 Dashboard 快照由後端保存。暱稱入口透過後端取得穩定使用者 ID。My Trail 進頁時讀取事件並依資料庫建立順序呈現；Dashboard 只讀取最新保存的快照，不在前端重算。

**技術：** Vue 3、Vue Router、TypeScript、Axios、Vitest、Vue Test Utils。

**規格：** `../../../../echotrail-project-management/EchoTrail-MVP-SPEC.md`（同層其他 repository；登入、A-5、B-1、C-10）。**後端契約：** `../../../../echotrail-backend/docs/superpowers/plans/2026-09-25-persistence-api.md`。前置條件：後端的 `2026-09-25-cloud-build-migrations.md`。

**範圍：** 本計畫只接通暱稱、現有聊天產卡、My Trail 與已保存 Dashboard。A-1／A-2 匯入、A-4 收斂規則、A-5「Please Generate my insight」特殊指令、B-2 匹配分數及 C-7～C-9 最終計分規則仍須另外規劃；本計畫沿用現有 `/api/llm/insight` 產生預覽。

## 全域限制

- 暱稱是純文字，正規化後須唯一；這是工程展示，並非身分驗證機制。
- `Generate Insight` 只產生未儲存預覽。使用者確認後才保存卡片，並顯示更新 Dashboard 按鈕。
- 同一段對話可產生多張卡片：續談沿用 `conversationId`，每次預覽與儲存只使用上次已確認後新增的訊息片段；按 `+New` 才建立新對話 ID。
- 「更新至 Dashboard」呼叫 `POST /api/dashboard/rebuild`；只有成功才跳轉。Dashboard 頁面透過 `GET /api/dashboard` 讀取已保存版本。
- My Trail 只顯示 `GET /api/events` 回傳的已確認卡片，依資料庫 `createdAt ASC, id ASC` 排列；不得從事件敘述推算時間。
- 儲存或重算失敗時保留預覽或已確認卡片，顯示清楚的錯誤訊息並允許重試。
- 正式使用流程不得顯示寫死的示範事件、日期、圖表分數或 Dashboard 備援內容。

## 審查重點

1. 儲存成功但回應遺失，使用者重試：沿用同一個 `clientEventId`，My Trail 只出現一張卡片。
2. 使用者切換暱稱：先清除前一位使用者的卡片、草稿、Trail 與 Dashboard，再讀取新使用者資料。
3. Dashboard 重算失敗，或因新增卡片回傳 409：停留在卡片頁、提供重試，先前保存的 Dashboard 保持可讀。
4. 兩筆事件顯示相同日期：維持 API 的 `createdAt,id` 順序，並用穩定 UUID 作為元件 key。
5. 儲存後、重算前重新整理頁面：My Trail 已包含卡片；Dashboard 仍顯示先前快照或空狀態。
6. 同一對話確認兩張卡：兩次 POST 共用 `conversationId`，第二次只送新增片段；切換使用者期間舊 GET 較晚完成，也不能蓋回舊資料。

---

## 後端 API 邊界與檔案分工

後端 API 回傳 camelCase JSON。`POST /api/users {name}` 回傳 `{id,name}`；`POST /api/events` 接受 `{userId,clientEventId,conversationId,messages,card,editedFields,signals}`，其中 `messages` 僅含本張卡的新增對話片段；新建時回傳 201 與 `EventRecord`，冪等重試時回傳 200；`GET /api/events?userId=` 回傳 `{events: EventRecord[]}`；`POST /api/dashboard/rebuild {userId}` 回傳 `DashboardSnapshot`；`GET /api/dashboard?userId=` 回傳 `{dashboard: DashboardSnapshot|null}`。`EventRecord` 包含 `id,userId,conversationId,messageStartSeq,messageEndSeq,createdAt,source,card,signals`。`DashboardSnapshot` 包含 `id,userId,createdAt,sourceRevision,sourceEventCount,profile,frameworks`；`profile` 與 `DashboardProfile` 同型別，`frameworks` 包含分數及證據。前端必須沿用後端計畫中的欄位名稱與狀態碼。

| 檔案 | 職責 |
| --- | --- |
| `src/lib/persistence.ts` | API 型別與有型別的 Axios 呼叫。 |
| `src/composables/useIdentity.ts` | 暱稱、穩定 ID、重新載入與切換使用者狀態。 |
| `src/components/identity/NameGate.vue` | 首頁純文字暱稱輸入。 |
| `src/composables/useEcho.ts` | 對話草稿、卡片預覽、重試 ID 與卡片確認。 |
| `src/composables/useTrail.ts` | 依使用者讀取事件，管理載入與錯誤狀態。 |
| `src/composables/useDashboard.ts` | 依使用者讀取已保存快照及明確觸發重算。 |
| `src/App.vue`、`src/views/HomeView.vue` | 暱稱入口、兩個獨立的卡片動作，以及成功後才跳轉。 |
| `src/views/TrailView.vue`、`src/views/DashboardView.vue` | 顯示 API 結果及空狀態、錯誤狀態。 |

### 任務 1：暱稱入口與持久化 API 客戶端

**檔案：** 新增 `src/lib/persistence.ts`、`src/composables/useIdentity.ts`、`src/components/identity/NameGate.vue`、`src/__tests__/identity.spec.ts`；修改 `src/App.vue`。

**介面：** `useIdentity()` 回傳 `{ user: Ref<{id:string;name:string}|null>, busy, error, enter(name):Promise<void>, switchUser():void }`。`enter()` 呼叫 `POST /users`，只將回傳的 `{id,name}` 存入 localStorage 的 `echotrail-user-v1`；重新載入時以儲存的名稱再次向 API 取得使用者。`switchUser()` 清除使用者範圍的對話、預覽、已確認卡片、Trail、Dashboard 與儲存資料，讓未完成的舊使用者請求失效，再顯示暱稱入口。

- [ ] **步驟 1：先寫失敗測試。** 以 API mock 掛載 App。輸入暱稱前，側欄與路由內容應隱藏。送出「  小美  」後，確認 API 收到去除頭尾空白的名稱且側欄出現；重新載入時應重新向 API 取得使用者；切換使用者後不得看見前一位的對話草稿、確認卡片、Trail 或 Dashboard。讓舊使用者的請求在切換後才完成，也不得改寫新使用者狀態。空名稱應留在入口並顯示驗證錯誤；另一個名稱應取得不同的後端 ID。

```ts
await wrapper.get('input[name="nickname"]').setValue('  小美  ')
await wrapper.get('form').trigger('submit')
expect(api.post).toHaveBeenCalledWith('/users', { name: '小美' })
```

- [ ] **步驟 2：執行 `npm test -- src/__tests__/identity.spec.ts`；預期失敗，因為 NameGate 尚不存在。**
- [ ] **步驟 3：實作 API 型別與呼叫。** `resolveUser(name)` 向 `/users` 發出 POST；`saveEvent(input)` 向 `/events` 發出 POST；`fetchEvents(userId)` 以 `params` 呼叫 `/events`；`rebuildDashboard(userId)` 向 `/dashboard/rebuild` 發出 POST；`fetchDashboard(userId)` 以 `params` 呼叫 `/dashboard`。在 `src/lib/persistence.ts` 集中定義 `CardFields`、`InsightSignal`、`ConfirmEventInput`（後端 POST 契約）、`EventRecord`、`DashboardSnapshot`，其他檔案直接匯入。`NameGate` 提供文字輸入框、送出按鈕、忙碌與錯誤狀態。尚無使用者時 App 顯示 `NameGate`；側欄只在有使用者時顯示。

```ts
export async function resolveUser(name: string): Promise<User> {
  const { data } = await api.post<User>('/users', { name: name.trim() })
  return data
}
export async function fetchEvents(userId: string): Promise<EventRecord[]> {
  const { data } = await api.get<{ events: EventRecord[] }>('/events', { params: { userId } })
  return data.events
}
```

- [ ] **步驟 4：執行 `npm test -- src/__tests__/identity.spec.ts` 與 `npm run type-check`；預期通過。**
- [ ] **步驟 5：提交。** `git add src/lib/persistence.ts src/composables/useIdentity.ts src/components/identity/NameGate.vue src/App.vue src/__tests__/identity.spec.ts && git commit -m "feat: add named demo user gate"`。

### 任務 2：預覽、確認，再明確更新 Dashboard

**檔案：** 修改 `src/composables/useEcho.ts`、`src/views/HomeView.vue`、`src/components/echo/EchoCard.vue`、`src/__tests__/echo.spec.ts`；新增 `src/composables/useDashboard.ts`、`src/__tests__/echo-persistence.spec.ts`。

**介面：** `generateInsight()` 只回傳預覽；`confirmInsight(): Promise<void>` 以預覽出現時建立的 UUID 為冪等鍵，將已保存的 `EventRecord` 放入 `confirmedEvent`；第一次送出時凍結完整 `ConfirmEventInput`，網路結果不明時重試同一 payload；`useDashboard().rebuild(userId): Promise<DashboardSnapshot>` 明確呼叫重算。`conversationId` 在 `+New` 時以 UUID 建立，`segmentStartIndex` 記錄下一張卡片的第一則新訊息。

- [ ] **步驟 1：先寫失敗測試。** 產生預覽後確認未呼叫 `/events`。確認卡片時，檢查只發出一次 POST，包含目前使用者 ID、`conversationId`、穩定的客戶端事件 ID、本次使用者與模型訊息片段、編輯後卡片及訊號；成功後確認按鈕改為「更新至 Dashboard」。模擬儲存後網路回應遺失，讓卡片草稿變動後重試仍須送出第一次的完整 payload；明確 400 驗證失敗則解除凍結，允許編輯後再送。預覽或確認狀態不得繼續送聊天訊息，須先確認成功並按「繼續此對話」或選 `+New`。按「繼續此對話」後再產生第二張卡，驗證 `conversationId` 不變、第二次僅送新片段，第一次原文不會作為第二張卡片的引用；按 `+New` 則產生不同 ID。讓儲存或 Dashboard 重算請求在切換使用者後才完成，舊回應不得改寫新使用者卡片或觸發跳轉。重算成功才跳至 `/dashboard`；模擬 500／409 時不得跳轉，卡片保留並顯示重試訊息。POST 必須包含卡片編輯，引用證據依後端契約驗證。

```ts
expect(saveEvent).not.toHaveBeenCalled()
await wrapper.get('[data-test="confirm-card"]').trigger('click')
expect(saveEvent).toHaveBeenCalledTimes(1)
expect(rebuildDashboard).not.toHaveBeenCalled()
```

- [ ] **步驟 2：執行 `npm test -- src/__tests__/echo-persistence.spec.ts`；預期失敗，因為尚無卡片確認按鈕與動作。**
- [ ] **步驟 3：重整 composable 與 UI。** `state.messages`、`state.draft`、`state.insight` 僅保留在暫時狀態。維持整段對話於畫面，從 `segmentStartIndex` 起切出本次事件片段給 `generateInsightLlm` 與 `/events`；本事件片段須通過現有角色與長度驗證。現有 `send()` 對整段 `state.messages.length >= 32` 的限制改為本片段上限；聊天回覆呼叫 `chatLlm` 時只送最後最多 31 則訊息，以符合現有 `/api/llm/chat` 限制，讓續談可以參考近期上下文。`generateInsightLlm` 填入預覽，不加入 localStorage 的 `events`。預覽建立時只產生一次 `clientEventId = crypto.randomUUID()`，重試時不變。讓 `EchoCard` 預覽中的七個欄位可編輯，並以 `editedFields` 記錄使用者實際修改的欄位名稱。第一次確認送出時將 `'echo'` 角色轉成 `'model'`，凍結含 `conversationId`、本次片段、卡片與訊號的 `ConfirmEventInput`；網路結果不明時原樣重試，明確 400 時清除凍結供修正。只有回應時目前使用者 ID 與請求的 `userId` 相同，才能更新 `confirmedEvent` 或在 Dashboard 重算成功後導頁。切換使用者須清掉 `pendingSavePayload`。有預覽或已確認卡片時先停用聊天輸入，避免片段邊界漂移。`HomeView` 依序顯示確認與更新 Dashboard 兩個獨立按鈕，另提供「繼續此對話」：只在確認成功後清除預覽／本次確認狀態，設定 `segmentStartIndex=state.messages.length`，保留訊息與對話 ID；`+New` 則清空草稿與對話，換新的 `conversationId`，不刪資料庫紀錄。重算成功且收到 200 後才呼叫 router push。以 `try/finally` 管理 `status.busy`，將回應錯誤映射至 `status.error`。進入暱稱後預設使用真實模式；模擬資料僅供獨立預覽測試或明確標示的示範路由，不得混入正式 Trail／Dashboard。

```ts
const pendingSavePayload = ref<ConfirmEventInput | null>(null)
async function confirmInsight(): Promise<void> {
  if (!user.value || !state.insight || !clientEventId.value || status.busy) return
  status.busy = true
  const payload = pendingSavePayload.value ?? {
    userId: user.value.id,
    clientEventId: clientEventId.value,
    conversationId: conversationId.value,
    messages: state.messages.slice(segmentStartIndex.value).map(({ role, text }) => ({ role: role === 'echo' ? 'model' as const : 'user' as const, text })),
    card: cardFromPreview(state.insight),
    editedFields: [...editedFields.value],
    signals: structuredClone(state.insight.signals ?? []),
  }
  pendingSavePayload.value = payload
  try {
    const result = await saveEvent(payload)
    if (user.value?.id === payload.userId) confirmedEvent.value = result
  } catch (error) {
    if (user.value?.id === payload.userId) {
      if (axios.isAxiosError(error) && error.response?.status === 400) pendingSavePayload.value = null
      const data: unknown = axios.isAxiosError(error) ? error.response?.data : null
      status.error = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error : '暫時無法儲存卡片，請重試。'
    }
  } finally { if (user.value?.id === payload.userId) status.busy = false }
}
```

- [ ] **步驟 4：執行聚焦測試、完整測試、lint 與型別檢查；預期通過。** `npm test && npm run lint && npm run type-check`。
- [ ] **步驟 5：提交。** `git add src/composables/useEcho.ts src/composables/useDashboard.ts src/views/HomeView.vue src/components/echo/EchoCard.vue src/__tests__ && git commit -m "feat: confirm cards before dashboard rebuild"`。

### 任務 3：依資料庫建立順序讀取 My Trail 事件

**檔案：** 新增 `src/composables/useTrail.ts`、`src/__tests__/trail-persistence.spec.ts`；修改 `src/views/TrailView.vue`、`src/components/echo/EchoCard.vue`。只有在分離 UI 卡片 props 與數字型模擬 ID 時，才修改 `src/mocks/echo.ts`。

**介面：** `useTrail().load(userId): Promise<void>` 在進入路由及切換使用者時讀取 API 清單。UI 使用 `EventRecord.id` 作為 key，`createdAt` 只用於顯示或分組。排序由後端負責，前端保留回傳順序。

- [ ] **步驟 1：先寫失敗測試。** API 依 `createdAt,id` 回傳兩筆同日期事件時，My Trail 須維持該順序顯示兩筆。未確認預覽不得出現；已確認卡片即使未重算 Dashboard 也須出現。重新載入時再向 API 讀取；切換使用者時先清除舊事件，且讓舊使用者的延遲 GET 回應在切換後完成，仍不得蓋回舊事件。空清單顯示「還沒有留下事件」；API 錯誤顯示重試。正式流程不得寫死 2026／Q3，也不得使用模擬 `trailEvents`。

```ts
expect(wrapper.findAll('[data-test="trail-event"]').map((el) => el.attributes('data-event-id')))
  .toEqual([firstId, secondId])
```

- [ ] **步驟 2：執行 `npm test -- src/__tests__/trail-persistence.spec.ts`；預期失敗，因為目前畫面只呈現最新一筆本機事件。**
- [ ] **步驟 3：替換 Trail 資料來源。** 進入路由時呼叫 `fetchEvents(user.id)`；ID 改變時先清空清單，再以 `event.card` 交給 `<EchoCard>` 顯示所有回傳事件。可用 `Asia/Taipei` 顯示時區和 `new Date(event.createdAt)` 建立年／季分組，或使用簡單的依序清單；兩種方式都不得改變順序。事件序號是畫面顯示索引，不是 UUID 片段，也不是從卡片文字推得的日期。空狀態文案改成「確認 Echo Card 後，事件就會出現在這裡。」正式路由移除 V2 模擬切換。

```ts
let loadRequest = 0
watch(() => user.value?.id, async (id) => {
  const request = ++loadRequest
  events.value = []
  if (!id) return
  const result = await fetchEvents(id)
  if (request === loadRequest && user.value?.id === id) events.value = result
}, { immediate: true })
```

- [ ] **步驟 4：執行聚焦測試、lint 與型別檢查；預期通過。** `npm test -- src/__tests__/trail-persistence.spec.ts && npm run lint && npm run type-check`。
- [ ] **步驟 5：提交。** `git add src/composables/useTrail.ts src/views/TrailView.vue src/components/echo/EchoCard.vue src/mocks/echo.ts src/__tests__/trail-persistence.spec.ts && git commit -m "feat: load my trail from saved events"`。

### 任務 4：Dashboard 只讀取一個已保存版本

**檔案：** 修改 `src/composables/useDashboard.ts`、`src/views/DashboardView.vue`；新增 `src/__tests__/dashboard-persistence.spec.ts`；修改 `docs/frontend-architecture.md`、`docs/specs/dashboard.md`、`docs/specs/my-trail.md`。

**介面：** `useDashboard().load(userId)` 呼叫 `fetchDashboard(userId)`，設定 `snapshot: Ref<DashboardSnapshot|null>`；畫面讀取 `snapshot.profile` 與 `snapshot.frameworks`，不使用 `allEvents`。

- [ ] **步驟 1：先寫失敗測試。** 首次 GET 回傳 null 時顯示空狀態，不顯示假的 Persona 或圖表值。已保存版本的每個個人概況區塊、框架分數與證據都應來自同一次結果，不呼叫 `generateInsightLlm` 或瀏覽器端聚合。重新載入 GET 回傳相同結果。確認新事件後、重算前，GET 仍顯示舊版本；重算後重新載入顯示新版。切換使用者時先清除舊概況；讓舊使用者的延遲 GET 回應較晚完成，也不能蓋回舊快照。API 失敗時顯示重試，不使用備援假資料。

```ts
expect(fetchDashboard).toHaveBeenCalledWith(userId)
expect(wrapper.text()).toContain(snapshot.profile.persona.headline)
expect(wrapper.text()).not.toContain('假資料')
```

- [ ] **步驟 2：執行 `npm test -- src/__tests__/dashboard-persistence.spec.ts`；預期失敗，因為目前 Dashboard 由 `allEvents` 在前端計算。**
- [ ] **步驟 3：替換計算來源。** Persona、職涯錨點、關鍵詞、模式與北極星從 `snapshot?.profile` 讀取；RIASEC／DISC／Schein 分數及證據從 `snapshot?.frameworks.scores` 與 `.evidence` 讀取。只保留 CSS 長條寬度、DISC 座標等呈現計算。移除 `fallbackProfile()`、`analyzedEvents` 與本機聚合。產品分數規則尚未決定前，框架分數標示「事件訊號預覽」。清楚呈現載入中、空狀態、錯誤及舊快照狀態；`load(userId)` 完成時再核對目前使用者 ID 或請求序號，避免延遲回應蓋回前一位使用者的資料。標頭可顯示 `sourceEventCount`、`createdAt`，不得從事件文字推日期。
- [ ] **步驟 4：更新前端文件，說明確認與重算是兩個動作、資料由 API 持有；執行 `npm test && npm run lint && npm run format:check && npm run build`；預期通過。**
- [ ] **步驟 5：提交。** `git add src/composables/useDashboard.ts src/views/DashboardView.vue src/__tests__/dashboard-persistence.spec.ts docs/frontend-architecture.md docs/specs/dashboard.md docs/specs/my-trail.md && git commit -m "feat: render saved dashboard snapshots"`。

## 自我檢查與交接

本計畫涵蓋暱稱入口、未儲存預覽、先確認再重算、完整 Trail、已保存 Dashboard 讀取、重新載入、切換使用者、重試與同日期排序。六項審查重點各有對應任務的測試。先完成後端契約與 migration，才能用真實回應驗證前端。既有模擬 UI 可保留於測試，但不得作為正式 Trail 或 Dashboard 的資料來源。
