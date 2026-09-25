# Persisted Echo Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a named demo user confirm an Echo Card, see it immediately in My Trail, explicitly rebuild Dashboard, and reload both pages from PostgreSQL-backed API results.

**Architecture:** Keep ephemeral draft conversation/card state in Vue, but make confirmed events and Dashboard snapshots server-owned. A nickname gate resolves a stable user ID through the backend. My Trail fetches server events on entry and renders database creation order; Dashboard fetches only the latest saved snapshot, with no client-side recomputation.

**Tech Stack:** Vue 3, Vue Router, TypeScript, Axios, Vitest, Vue Test Utils.

**Spec:** `../../../../echotrail-project-management/EchoTrail-MVP-SPEC.md` (repository sibling; 登入, A-5, B-1, C-10). **Backend contract:** `../../../../echotrail-backend/docs/superpowers/plans/2026-09-25-persistence-api.md`. Migration/deployment prerequisite: backend `2026-09-25-cloud-build-migrations.md`.

## Global Constraints

- Nickname is plain text and unique after normalization; this is an engineering demo, not an authentication boundary.
- `Generate Insight` produces an unsaved preview. User confirmation persists the card before the Dashboard button appears.
- `更新至 Dashboard` calls `POST /api/dashboard/rebuild` and navigates only on success. The Dashboard page fetches the saved run using `GET /api/dashboard`.
- My Trail shows only confirmed cards returned by `GET /api/events`, ordered by database `createdAt ASC, id ASC`. Story text is never parsed for time.
- A failed save or rebuild leaves the preview/confirmed card available to retry and displays a clear error.
- Avoid showing hardcoded demo events, dates, chart scores, or Dashboard fallback content in the real user flow.

## Review Focus

1. Save response is lost and the user retries: reuse the same `clientEventId`; one card appears in My Trail.
2. User switches nickname: previous user's card, draft, Trail, and Dashboard are cleared before loading the new user's data.
3. Dashboard rebuild fails or returns 409 because a new card arrived: remain on the card, show retry, and leave prior saved Dashboard visible on its page.
4. Two events have the same displayed date: preserve API `createdAt,id` order and stable UUID keys.
5. Page reload after save but before rebuild: My Trail includes the card; Dashboard still shows the previous saved snapshot or an empty state.

---

## Backend API boundary and file map

The backend API returns camelCase JSON. `POST /api/users {name}` yields `{id,name}`; `POST /api/events` takes `{userId,clientEventId,conversationId?,messages,card,editedFields,signals}` and yields `EventRecord` (`201` new, `200` idempotent retry); `GET /api/events?userId=` yields `{events: EventRecord[]}`; `POST /api/dashboard/rebuild {userId}` yields `DashboardSnapshot`; `GET /api/dashboard?userId=` yields `{dashboard: DashboardSnapshot|null}`. `EventRecord` contains `id,userId,conversationId,createdAt,source,card,signals`. `DashboardSnapshot` contains `id,userId,createdAt,sourceRevision,sourceEventCount,profile,frameworks`; `profile` matches `DashboardProfile`, `frameworks` includes scores and evidence. The frontend must use exact names and status codes from the backend plan.

| File | Responsibility |
| --- | --- |
| `src/lib/persistence.ts` | API types and typed Axios calls. |
| `src/composables/useIdentity.ts` | Nickname, stable ID, reload/switch state. |
| `src/components/identity/NameGate.vue` | First-screen plain-text name input. |
| `src/composables/useEcho.ts` | Draft conversation, preview, stable retry ID, card confirmation. |
| `src/composables/useTrail.ts` | User-scoped event fetch and loading/errors. |
| `src/composables/useDashboard.ts` | User-scoped saved snapshot fetch and explicit rebuild. |
| `src/App.vue`, `src/views/HomeView.vue` | Gate, two distinct card actions, no premature redirect. |
| `src/views/TrailView.vue`, `src/views/DashboardView.vue` | Render API results and empty/error states. |

### Task 1: Identity gate and typed persistence client

**Files:** Create `src/lib/persistence.ts`, `src/composables/useIdentity.ts`, `src/components/identity/NameGate.vue`, `src/__tests__/identity.spec.ts`; modify `src/App.vue`.

**Interfaces:** `useIdentity()` returns `{ user: Ref<{id:string;name:string}|null>, busy, error, enter(name):Promise<void>, switchUser():void }`. `enter()` calls `POST /users`, storing only the returned `{id,name}` in localStorage key `echotrail-user-v1`; on reload it re-resolves the stored name through the API. `switchUser()` clears user-scoped state and storage before showing the gate.

- [ ] **Step 1: Add failing tests.** Mount App with API mock. Before name entry, assert sidebar/routes are hidden. Submit `  小美  ` and assert API called with trimmed name and sidebar appears; reload with stored name and assert re-resolution; switch and assert no previous user's content is visible. Empty name stays on gate with validation error. Another name gets a distinct server ID.

```ts
await wrapper.get('input[name="nickname"]').setValue('  小美  ')
await wrapper.get('form').trigger('submit')
expect(api.post).toHaveBeenCalledWith('/users', { name: '小美' })
```

- [ ] **Step 2: Run `npm test -- src/__tests__/identity.spec.ts`; expect fail because NameGate does not exist.**
- [ ] **Step 3: Implement client types and calls.** `resolveUser(name)` posts `/users`; `saveEvent(input)` posts `/events`; `fetchEvents(userId)` gets `/events` with `params`; `rebuildDashboard(userId)` posts `/dashboard/rebuild`; `fetchDashboard(userId)` gets `/dashboard` with `params`. Define `CardFields`, `InsightSignal`, `EventRecord`, `DashboardSnapshot` once in `src/lib/persistence.ts` and import them everywhere else. `NameGate` has one text input, submit button, busy/error states. App renders `NameGate` until `user` exists. Keep sidebar only for an active user.

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

- [ ] **Step 4: Run `npm test -- src/__tests__/identity.spec.ts`, `npm run type-check`; expect pass.**
- [ ] **Step 5: Commit.** `git add src/lib/persistence.ts src/composables/useIdentity.ts src/components/identity/NameGate.vue src/App.vue src/__tests__/identity.spec.ts && git commit -m "feat: add named demo user gate"`.

### Task 2: Preview, confirm, then explicit Dashboard update

**Files:** Modify `src/composables/useEcho.ts`, `src/views/HomeView.vue`, `src/components/echo/EchoCard.vue`, `src/__tests__/echo.spec.ts`; create `src/composables/useDashboard.ts`, `src/__tests__/echo-persistence.spec.ts`.

**Interfaces:** `generateInsight()` returns preview only; `confirmInsight(): Promise<EventRecord>` saves once, using a UUID created when the preview appears and retained on retries; `useDashboard().rebuild(userId): Promise<DashboardSnapshot>` posts explicit rebuild. The saved `EventRecord` is a separate `confirmedEvent` state from unsaved preview.

- [ ] **Step 1: Add failing tests.** Generate a preview and assert no `/events` call. Confirm and assert exactly one POST with current user ID, stable client event ID, model/user messages, edited card and signals; assert confirmation button is then replaced by “更新至 Dashboard”. Simulate network failure after save; retry must send same client event ID. Simulate rebuild success and assert navigation to `/dashboard`; simulate 500/409 and assert no navigation, visible retry message, and card remains. Card edits must be included in POST and grounded quote handled by backend contract.

```ts
expect(saveEvent).not.toHaveBeenCalled()
await wrapper.get('[data-test="confirm-card"]').trigger('click')
expect(saveEvent).toHaveBeenCalledTimes(1)
expect(rebuildDashboard).not.toHaveBeenCalled()
```

- [ ] **Step 2: Run `npm test -- src/__tests__/echo-persistence.spec.ts`; expect failure because confirm button/action is missing.**
- [ ] **Step 3: Refactor composable and UI.** Keep `state.messages`, `state.draft`, and `state.insight` ephemeral. `generateInsightLlm` populates preview; do not append it to localStorage `events`. At preview creation, assign `clientEventId = crypto.randomUUID()` once. Make the seven card fields editable in `EchoCard` preview and track field names the user actually changed in `editedFields`; confirmation maps `'echo'` role to `'model'`, posts to `/events`, stores response in `confirmedEvent`, and updates Trail cache. `HomeView` renders two distinct buttons sequentially. On rebuild, call API, then router push only after 200. Set `status.busy` in `try/finally`; map response errors to `status.error`. Starting `+New` clears preview/confirmed event, not database rows. Real mode is the default after identity entry; keep mock data only in isolated preview tests or an explicitly labeled demo route, never mixed with real Trail/Dashboard.

```ts
async function confirmInsight(): Promise<void> {
  if (!user.value || !state.insight || !clientEventId.value || status.busy) return
  status.busy = true
  try {
    confirmedEvent.value = await saveEvent({
      userId: user.value.id,
      clientEventId: clientEventId.value,
      messages: state.messages.map(({ role, text }) => ({ role: role === 'echo' ? 'model' : 'user', text })),
      card: cardFromPreview(state.insight),
      editedFields: editedFields.value,
      signals: state.insight.signals ?? [],
    })
  } finally { status.busy = false }
}
```

- [ ] **Step 4: Run focused tests, full test suite, lint/type check; expect pass.** `npm test && npm run lint && npm run type-check`.
- [ ] **Step 5: Commit.** `git add src/composables/useEcho.ts src/composables/useDashboard.ts src/views/HomeView.vue src/components/echo/EchoCard.vue src/__tests__ && git commit -m "feat: confirm cards before dashboard rebuild"`.

### Task 3: My Trail from saved events and database creation order

**Files:** Create `src/composables/useTrail.ts`, `src/__tests__/trail-persistence.spec.ts`; modify `src/views/TrailView.vue`, `src/components/echo/EchoCard.vue`, `src/mocks/echo.ts` only as needed to separate UI card props from numeric mock IDs.

**Interfaces:** `useTrail().load(userId): Promise<void>` fetches API list on route entry and user switch. UI uses `EventRecord.id` as key and `createdAt` only for display/grouping. Sort is server-owned; frontend must preserve returned order.

- [ ] **Step 1: Add failing tests.** API returns two saved events in `createdAt,id` order with the same calendar date; My Trail displays both in that order. Unconfirmed preview is absent; a confirmed card is present before Dashboard rebuild. Reload fetches again; switching users clears old entries before fetch. Empty list shows “還沒有留下事件”; API error shows retry. Assert no hardcoded 2026/Q3 and no mock `trailEvents` in the real path.

```ts
expect(wrapper.findAll('[data-test="trail-event"]').map((el) => el.attributes('data-event-id')))
  .toEqual([firstId, secondId])
```

- [ ] **Step 2: Run `npm test -- src/__tests__/trail-persistence.spec.ts`; expect failure because current view renders only latest local event.**
- [ ] **Step 3: Replace Trail data source.** On route entry call `fetchEvents(user.id)`, clear list when ID changes, render all returned events with `<EchoCard>` from `event.card`. Build year/quarter groups from `new Date(event.createdAt)` in `Asia/Taipei` display timezone or use a simple ordered list; neither path may change order. Event sequence labels are display indices, not UUID fragments and not dates inferred from card text. Change empty copy to “確認 Echo Card 後，事件就會出現在這裡。” Remove V2 mock toggle from the real route.

```ts
watch(() => user.value?.id, async (id) => {
  events.value = []
  if (id) events.value = await fetchEvents(id)
}, { immediate: true })
```

- [ ] **Step 4: Run focused tests, lint, type check; expect pass.** `npm test -- src/__tests__/trail-persistence.spec.ts && npm run lint && npm run type-check`.
- [ ] **Step 5: Commit.** `git add src/composables/useTrail.ts src/views/TrailView.vue src/components/echo/EchoCard.vue src/mocks/echo.ts src/__tests__/trail-persistence.spec.ts && git commit -m "feat: load my trail from saved events"`.

### Task 4: Dashboard reads one saved run

**Files:** Modify `src/composables/useDashboard.ts`, `src/views/DashboardView.vue`; create `src/__tests__/dashboard-persistence.spec.ts`; modify `docs/frontend-architecture.md`, `docs/specs/dashboard.md`, `docs/specs/my-trail.md`.

**Interfaces:** `useDashboard().load(userId)` calls `fetchDashboard(userId)` and sets `snapshot: Ref<DashboardSnapshot|null>`; view reads `snapshot.profile` and `snapshot.frameworks`, never `allEvents`.

- [ ] **Step 1: Add failing tests.** Initial GET returns null and view shows an empty state without fake Persona/chart values. A saved run renders every profile section and framework score/evidence from that same run, with no `generateInsightLlm` or browser aggregation calls. Reload GET returns identical result. After an event is confirmed but before rebuild, GET still shows prior run; after rebuild, route reload shows new run. Switch users and verify old profile disappears before new fetch. API failure shows retry, not fallback data.

```ts
expect(fetchDashboard).toHaveBeenCalledWith(userId)
expect(wrapper.text()).toContain(snapshot.profile.persona.headline)
expect(wrapper.text()).not.toContain('假資料')
```

- [ ] **Step 2: Run `npm test -- src/__tests__/dashboard-persistence.spec.ts`; expect failure because current Dashboard computes from `allEvents`.**
- [ ] **Step 3: Replace computed source.** Read `snapshot?.profile` for Persona, anchor, keywords, patterns, north star; read `snapshot?.frameworks.scores` and `.evidence` for RIASEC/DISC/Schein. Keep only display math such as CSS bar widths and DISC marker position. Remove `fallbackProfile()`, `analyzedEvents`, and all local aggregation. Label framework scores “事件訊號預覽” while the product score rule remains undecided. Render loading, empty, error, and stale-old-snapshot states clearly. The header can show `sourceEventCount` and `createdAt`, not a date derived from event text.
- [ ] **Step 4: Update frontend docs to describe separate confirm/rebuild actions and API-owned data; run `npm test && npm run lint && npm run format:check && npm run build`; expect pass.**
- [ ] **Step 5: Commit.** `git add src/composables/useDashboard.ts src/views/DashboardView.vue src/__tests__/dashboard-persistence.spec.ts docs/frontend-architecture.md docs/specs/dashboard.md docs/specs/my-trail.md && git commit -m "feat: render saved dashboard snapshots"`.

## Self-review and handoff

The plan covers nickname entry, unsaved preview, confirm-before-rebuild, all-event Trail, saved Dashboard GET, reload, user switch, retry, and same-date order. Each of the five Review Focus cases has a test in its owning task. Backend contract and migration must be implemented first so the frontend can be verified against real responses. The current mock UI can remain in tests, but it must not supply user-facing real Trail or Dashboard values.
