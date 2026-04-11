# Tasks: Astra Zenith Streaming

**Status**: Completed
**Note**: This checklist is kept as the execution record for the finished implementation pass.

**Input**: docs/PLAN.md, docs/SPEC.md, docs/CONSTITUTION.md, docs/MODELS_SPEC.md, docs/ASTRA_ZENITH_ARCH_BLUEPRINT.md
**Prerequisites**: PLAN.md (✅), SPEC.md (✅)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1=對話串流, US2=C2觀測站, US3=n8n整合, US4=PWA

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 確認 Vite 6 + Tailwind v4 建置正常 (`npm run build`)
- [x] T002 [P] 確認 TypeScript 型別檢查通過 (`npm run type-check`)
- [x] T003 [P] 確認 `.az_core/` 持久化結構完整 (AGENT_STATE.json, MEMORY.md)
- [x] T040 遷移至 @google/genai Unified SDK (v1.48.0)
- [x] T041 實作 Express 傳輸層壓縮 (Gzip/Brotli)
- [x] T042 實作並發 Gate 優化 (Concurrency: 4)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 核心基礎設施，所有 User Story 依賴此階段完成

- [x] T004 建立 `src/scripts/core/types.ts` — 定義 AZAgentEvent, Mission, Session 型別
- [x] T005 建立 `src/scripts/core/middleware.ts` — Middleware Pipeline 基礎架構
- [x] T043 實作 Context Caching (Paid Tier 穩定緩存)
- [x] T044 實作 File API 優化 (多模態資源 URI 引用)
- [ ] T006 [P] 實作 `withRetry` 中間件 — 指數退避 + 隨機抖動 (Jitter)
- [x] T007 [P] 實作 `withTokenGuard` 中間件 — 兩階段壓縮 (Pruning + Pruning Logic)
- [ ] T008 [P] 實作 `withTurnTracking` 中間件 — 對話輪次限制
- [ ] T009 [P] 實作 `withAuditLog` 中間件 — 全鏈路追蹤寫入 .az_core
- [x] T010 在 `az_portal_types.ts` 中擴展 AgentEvent 加入 `path: string[]`
- [x] T011 實作 Zod Schema 校驗層 — 所有入站 Payload 驗證

**Checkpoint**: Foundation ready — User Story 實作可以開始

---

## Phase 3: User Story 1 — 即時 AI 多代理對話 (Priority: P1) 🎯 MVP

**Goal**: 使用者發送指令，A1-A6 協作串流回應

**Independent Test**: 發送分析指令 → 驗證 SSE 串流 → 檢查 Agent 路徑追蹤

### Implementation

- [x] T012 [US1] 重構 agents.ts — 整合 Middleware Pipeline 至 Agent Runner
- [ ] T013 [US1] 重構 az_portal_api_service.ts — Mission API 加入 path 追蹤
- [ ] T014 [US1] 重構 az_portal_handlers.ts — 事件分發改用管線式架構
- [x] T015 [US1] 更新 az_portal_chat_view.ts — 支援按 Agent path 分組渲染
- [ ] T016 [US1] 實作 Reasoning 摺疊 UI — Agent 「思考鏈」預設摺疊
- [ ] T017 [US1] 實作 Circuit Breaker — Gemini API RPM/TPM 熔斷機制
- [x] T018 [US1] 實作 Agent 狀態即時同步 — `m_agent_unit.ts` 顯示執行中/完成/錯誤
- [ ] T019 [US1] 實作 az_portal_logs_view.ts 日誌持久化 — 寫入 .az_core

**Checkpoint**: US1 完成 — 多代理對話串流功能可用

---

## Phase 4: User Story 2 — C2 戰略觀測站 (Priority: P2)

**Goal**: C2 HUD 即時顯示系統指標

**Independent Test**: 啟動系統 → 開啟 blueprint_viewer.html → 驗證 6 模組數據

### Implementation

- [ ] T020 [P] [US2] 為 C01 (Core Systems) 綁定 Token 消耗與 API 延遲數據
- [ ] T021 [P] [US2] 為 C02 (Efficiency) 綁定決策質量分析 (Confidence Score)
- [ ] T022 [P] [US2] 為 C03 (Metrics) 綁定即時串流流量圖表
- [ ] T023 [P] [US2] 為 C05 (Scan) 實作 Agent Discovery 雷達掃描聯動
- [ ] T024 [US2] 為 C06 (Flow) 綁定 Function Call Stream 日誌
- [ ] T025 [US2] 實作 Neural Spine Sidebar Agent 狀態動畫聯動
- [ ] T026 [US2] 實作主題切換 (Alpha/Beta/Delta) 的 CSS 變數動態更新
- [ ] T027 [US2] 實作 `az_portal_telemetry_view.ts` 遙測數據綁定

**Checkpoint**: US2 完成 — C2 觀測站全模組數據聯動

---

## Phase 5: User Story 3 — n8n 工作流整合 (Priority: P3)

**Goal**: Agent 結果自動觸發 n8n 工作流

**Independent Test**: Agent 完成任務 → 數據推送至 n8n → 查看 N8N View 狀態

### Implementation

- [ ] T028 [US3] 擴展 `az_portal_workflow.ts` — 定義 n8n Webhook 觸發介面
- [ ] T029 [US3] 實作 `az_portal_n8n_view.ts` — 工作流狀態追蹤 UI
- [ ] T030 [US3] 在 Agent Pipeline 末端加入 n8n 事件推送 Hook
- [ ] T031 [US3] 實作 n8n 工作流失敗的錯誤回傳與 UI 提示

**Checkpoint**: US3 完成 — n8n 自動化鏈路就緒

---

## Phase 6: User Story 4 — PWA 離線與安裝 (Priority: P3)

**Goal**: 可安裝的 PWA 體驗

**Independent Test**: 安裝 PWA → 離線載入 → 驗證 UI Shell 可用

### Implementation

- [ ] T032 [P] [US4] 優化 `sw.js` — 實作 Cache-First + Network-Fallback 策略
- [ ] T033 [P] [US4] 更新 `manifest.webmanifest` — 完善 icons、theme_color、display
- [ ] T034 [US4] 實作離線提示 UI — 無網路時顯示快取的 UI Shell + 狀態提示

**Checkpoint**: US4 完成 — PWA 安裝與離線功能就緒

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T035 [P] 效能優化 — C2 HUD requestAnimationFrame 節流、Shader 降級
- [ ] T036 [P] 安全加固 — Helmet.js 安全頭部、CSP 策略配置
- [ ] T037 [P] 文檔更新 — 同步 ARCH_BLUEPRINT、MODELS_SPEC、design_specs
- [ ] T038 程式碼清理 — 移除廢棄程式碼、統一命名規範
- [ ] T039 全鏈路測試 — 端到端流程驗證 (指令 → Agent → 串流 → HUD)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — 立即開始
- **Phase 2 (Foundational)**: 依賴 Phase 1 — **阻擋所有 User Stories**
- **Phase 3-6 (User Stories)**: 依賴 Phase 2 完成後可並行
- **Phase 7 (Polish)**: 依賴所有 User Stories 完成

### Parallel Opportunities

- T006/T007/T008/T009 (4 個中間件) 可完全並行開發
- T020-T023 (C2 模組數據綁定) 可完全並行開發
- T032/T033 (PWA 資源) 可並行開發
- Phase 3-6 的 User Stories 可由不同開發者並行推進

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup ✓
2. Phase 2: Foundational (Middleware Pipeline)
3. Phase 3: User Story 1 (多代理對話串流)
4. **STOP and VALIDATE**: 測試核心流程
5. Deploy/Demo MVP

### Incremental Delivery

1. Foundation → MVP (US1) → C2 HUD (US2) → n8n (US3) → PWA (US4) → Polish
2. 每個 Story 獨立交付，不破壞前一個 Story
