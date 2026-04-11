# 🎨 Gemini Synapse | UI Functional Specification (V-Next)

本文件定義 `blueprint_viewer.html` 作為專案樣板時的組件功能與排版邏輯，旨在將高保真 FUI 介面與 **Gemini Multi-Agent SDK** 的後端邏輯深度整合。

---

## 🏗️ 核心組件功能定義 (Component Functional Map)

根據原子化架構 (Atomic Architecture)，各個 UI 區塊對應的系統功能如下：

### 1. Neural Spine Sidebar (左側導覽矩陣)
*   **功能定義**：**Agent 狀態與轉移矩陣 (Agent Handoff Matrix)**
*   **交互規格**：
    *   **中樞節點 (CPU/Monitor)**：代表 Orchestrator (Delta Agent)。點擊可查看全局任務議程 (Agenda)。
    *   **外圍節點**：代表各領域專門 Agent (如 Alpha, Beta, Gamma)。
    *   **動態回饋**：當 Agent 處於 `Streaming` 狀態時，對應節點觸發 `pulse` 動畫並更換主題色。
    *   **意圖路由**：點擊節點可強制將當前對話路由 (Route) 至該 Agent 處理。

### 2. Data Tiles Grid (右側數據模組)
*   **C01: CORE_SYSTEMS** -> **資源消耗監控 (Resource HUD)**：實時顯示 Token 消耗、API 延遲 (TTFT) 與當前對話成本估算。
*   **C02: ASSET_EFFICIENCY** -> **決策質量分析 (Inference Metrics)**：顯示當前回應的自信度評分 (Confidence Score) 與自我修正次數 (Reflection Loops)。
*   **C03: REAL_TIME_METRICS** -> **記憶載體監控 (Memory Slot)**：顯示當前 `Context Caching` 的命效率與 Long-term Memory 檢索引擎狀態。
*   **C04: LOGISTICS_NETWORK** -> **RAG 知識軌跡 (Knowledge Trace)**：以地圖或節點圖形式展示 RAG 資料來源（如 PDF 跨頁索引或外部技術文檔位置）。
*   **C05: ENVIRONMENTAL_SCAN** -> **意圖探測儀 (Semantic Scanner)**：展示 `Semantic Router` 對用戶意圖的即時解析判斷路徑。
*   **C06: OPERATIONAL_FLOW** -> **工具調度日誌 (Function Call Stream)**：顯示 Agent 正在呼叫的外部 Tool (如 GitHub API, Search, DB Query) 之執行狀態。

### 3. Header & Footer (全局狀態欄)
*   **安全閘門 (System Gate)**：對應 `Human-in-the-loop` 模式。開關狀態決定組件是否在執行敏感 Tool 前需要人類確認。
*   **活動環 (Activity Ring)**：與後端 SSE (Server-Sent Events) 連動，旋轉表示數據正在持續串流。

---

## 🎨 排版設計策略 (Layout Strategy)

### 1. 響應式對話嵌入 (Dialog Integration)
*   **側欄模式 (Sidecar)**：當對話窗口開啟時，右側 Grid 分三欄縮減為兩欄，維持數據監控的同時提供寬敞的 Markdown 渲染空間。
*   **沈浸鏡像 (Immersive Overlay)**：訊息對話可直接在背景 HUD 的「玻璃質感層」上滑動，保持數據視覺的透射感。

### 2. 動態主題系統 (Aura Theming)
*   基於系統當前負載或角色切換，自動調整 CSS 變數：
    *   `--cyan` (預設/研究模式)
    *   `--purple` (分析/推理模式)
    *   `--magenta` (警告/高價值操作模式)

### 3. 性能自適應 (Adaptive Performance)
*   **Shader 降級**：在低功耗設備上自動禁用 `dot-matrix` 背景與高級模糊濾鏡，優先保證 `marked.js` 的渲染流暢度。

---

## 🔗 銜接藍圖 (Integration Roadmap)

1.  **數據綁定**：使用 `dashboard.js` 初始化組件，並透過 WebSocket/SSE 接收後端 Agent 狀態回傳。
2.  **指令聯控**：實現從介面點擊「雷達掃描」按鈕，觸發後端 `Agent Discovery` 流程。
3.  **視覺同步**：開發 `theme_controller.js` 實現對話內容與介面 Aura Effects 的步調一致。

---
*Created by Antigravity AI for Gemini Multi-Agent Evolution.*
