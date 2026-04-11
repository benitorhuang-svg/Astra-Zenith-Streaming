# Feature Specification: Astra Zenith Streaming Platform

**Feature Branch**: `main`
**Created**: 2026-04-07
**Status**: Active
**Input**: Multi-Agent AI Streaming Portal with Industrial-Grade C2 HUD

---

## User Scenarios & Testing

### User Story 1 — 即時 AI 多代理對話 (Priority: P1)

使用者透過 Portal 介面發送任務指令，系統自動調度 A1-A6 代理進行協作式分析，並以 SSE 串流即時回傳結果。

**Why this priority**: 這是產品的核心價值 — 多代理協作串流是所有功能的基礎。

**Independent Test**: 發送一個分析請求，驗證 A1 接收指令 → 分派至 A2-A5 → A6 彙整 → 結果串流至前端。

**Acceptance Scenarios**:

1. **Given** 使用者開啟 Portal, **When** 發送「分析系統效能」指令, **Then** A1 Leader 接收並分派任務至 Worker Agents，SSE 串流即時顯示各 Agent 回應
2. **Given** 多個 Agent 同時回應, **When** 串流交錯到達, **Then** 前端按 `path` 追蹤正確歸類並渲染各 Agent 輸出
3. **Given** Gemini API 發生 429 限流, **When** Agent 收到錯誤, **Then** withRetry 中間件自動以指數退避重試，使用者不察覺中斷

---

### User Story 2 — C2 戰略觀測站 (Priority: P2)

使用者透過 blueprint_viewer.html 觀測站，以高保真 FUI 介面即時監控所有 Agent 狀態、Token 消耗、API 延遲等系統指標。

**Why this priority**: 提供系統運行的透明度與可控性，是工業級部署的必要條件。

**Independent Test**: 啟動系統並開啟觀測站，驗證 6 個數據模組 (C01-C06) 正確接收並渲染後端數據。

**Acceptance Scenarios**:

1. **Given** 系統運行中, **When** 開啟 C2 觀測站, **Then** 6 個數據模組即時顯示：核心指標 (C01)、效率儀表 (C02)、流量圖表 (C03)、物流地圖 (C04)、雷達掃描 (C05)、邏輯流程 (C06)
2. **Given** Agent A3 正在執行, **When** 查看 Neural Spine Sidebar, **Then** 對應節點顯示 `pulse` 動畫與主題色切換
3. **Given** 使用者點擊主題切換鈕, **When** 選擇 `Beta` 模式, **Then** 背景極光、發光色統一切換至對應配色

---

### User Story 3 — n8n 工作流整合 (Priority: P3)

使用者可透過 Portal 觸發 n8n 自動化工作流，將 Agent 分析結果串接至外部系統 (如通知、報告生成)。

**Why this priority**: 擴展系統的自動化能力，實現 Agent 結果的實際業務應用。

**Independent Test**: 從 Portal 觸發一個 n8n 工作流，驗證數據正確傳遞並觸發後續動作。

**Acceptance Scenarios**:

1. **Given** n8n 工作流已配置, **When** Agent 完成分析, **Then** 結果自動推送至 n8n webhook
2. **Given** 工作流執行中, **When** 查看 Portal 的 N8N View, **Then** 顯示工作流執行狀態與歷程

---

### User Story 4 — PWA 離線與安裝 (Priority: P3)

使用者可將 Astra Zenith 安裝為 PWA 應用，Service Worker 快取靜態資源，提供基本離線體驗。

**Why this priority**: 提升部署便利性與使用者體驗。

**Acceptance Scenarios**:

1. **Given** 使用者首次載入, **When** Service Worker 註冊成功, **Then** 靜態資源被快取
2. **Given** 網路離線, **When** 開啟 PWA, **Then** 顯示快取的 UI shell 與離線提示

---

### Edge Cases

- Agent Pool 中某個 Agent 長時間無回應時，系統如何降級？
- Token 超過 1M 上限時的壓縮觸發邏輯
- 多個使用者同時對話時的 Session 隔離
- n8n 工作流失敗時的錯誤回傳與 UI 提示

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST 支援 6 Agent (A1-A6) 的並行串流通訊 (4 Concurrency Slots)
- **FR-002**: System MUST 透過 SSE 協議向前端推送 Agent 事件，並支援傳輸層壓縮 (Gzip)
- **FR-003**: System MUST 為每個 Agent Event 附加 `path: string[]` 路徑追蹤
- **FR-004**: System MUST 實作 Gemini Unified SDK 的 Circuit Breaker 與自動重試
- **FR-005**: System MUST 實作三段式上下文優化：Pruning + Context Caching + File API
- **FR-006**: System MUST 在 C2 觀測站即時呈現 Agent 狀態、Token 消耗、API 延遲 (Telemetry)
- **FR-007**: System MUST 支援 Agent 主題色切換 (Alpha/Beta/Delta)
- **FR-008**: System MUST 透過 `.az_core` 持久化 Agent 狀態與記憶
- **FR-009**: System MUST 支援 n8n Workflow 觸發與狀態追蹤
- **FR-010**: System MUST 作為 PWA 可安裝，提供 Service Worker 快取

### Key Entities

- **Agent**: 代理人實例 (A1-A6)，採用 @google/genai 原生介面
- **Mission**: 使用者任務，包含主題、代理序列、穩定 Session ID
- **FileAsset**: 多模態資源，透過 File API 上傳並以 URI 引用
- **AgentEvent**: 串流事件，包含 path、type、payload、usageMetadata

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: 使用者從發送指令到首個 Agent 回應 < 2.5 秒 (TTFT)
- **SC-002**: C2 觀測站 6 個模組同時渲染時維持 60fps
- **SC-003**: 對話 Token 負載透過 Caching 與 Pruning 減少 70%+
- **SC-004**: 多模態資源傳輸延遲透過 File API 降低 80% (相比 Base64)
- **SC-005**: PWA Lighthouse 分數 > 90

---

## Assumptions

- 使用者具備穩定網路連接 (離線模式僅快取 UI shell)
- Gemini 3 Flash / 3.1 Flash-Lite 維持 Free Tier 可用性
- n8n 實例由使用者自行部署與維護
- 瀏覽器支援 ES6 Module、SSE、Service Worker
- 初期為單一使用者模式，Multi-tenancy 為後續階段
