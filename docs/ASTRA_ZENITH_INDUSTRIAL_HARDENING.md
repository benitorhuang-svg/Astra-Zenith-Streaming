# Astra Zenith Streaming 工業級深度加固與優化方案 (Industrial Hardening Supplement)

本文件是針對 `ASTRA_ZENITH_OPTIMIZATION_PLAN.md` 的深度技術補充，旨在利用 **OpenHarness (OH)** 的底層機制，解決工業環境中對「低延遲、高安全、長效執行」的極致要求。

---

## 🏗️ 1. 深度協議對齊：Worker-level Event Dispatcher

**現狀**：目前的 `az_worker_hub.ts` 僅負責基礎的 JSON 解析。當數據量激增（如 50 條同時返回的感測器日誌）時，主執行緒依然會面臨渲染壓力。

**加固方案 (OH `ui-stream.ts` 模式)**：
- **流分片與封裝**：模仿 OH 的 `sessionEventsToUIStream`，在 Worker 內就完成 `AgentEvent` 到「UI 分片」的轉換。
- **預處理與過濾**：在 Worker 中實作 **Binary Guardrail**。若偵測到感測器回傳的是非結構化二進位數據（如 raw binary dump），直接在 Worker 攔截並轉化為 `[Binary Blob - Size: 5MB]` 佔位符，防止主執行緒因大型字串操作而崩潰。
- **差異化更新 (Diff-patching)**：僅在數據發生變化時（透過 `path` 追蹤）才向主執行緒發送 `postMessage`，減少通訊開銷。

---

## 🔒 2. 工業控制權限管理：具備 Mutex 的 Approve 機制

**現狀**：針對工業設施（如 PLC 修復、電源切換）的操控，目前的 UI 缺乏統一的「同步審核」邏輯。

**加固方案 (OH `agent.ts` 模式)**：
- **操作互斥鎖 (Prompt Mutex)**：為所有的 `ExecuteCommand` 注入 `wrapToolsWithApproval`。
- **鎖定邏輯**：當 A1 到 A6 代理同時提出「多個緊急操作」時，系統內置一個 Promise 隊列。前端 UI 不會一次跳出 6 個視窗，而是讓操作員「按順序」審核。這能有效防止在工業緊急情況下的人為誤操作。

---

## 🧠 3. 預測性資源預判 (Asset Pre-fetching & Capping)

**現狀**：在讀取大型日誌文件時，系統反應較慢。

**加固方案 (OH `createFsTools.ts` 模式)**：
- **行長度限制 (Line Capping)**：在日誌讀取 Provider 層級，強制對超過 2000 字元的單行（如報錯堆棧或加密後的配置）進行強制截斷。這保證了 Monaco 或渲染器不會在處理超長行時卡死。
- **分頁讀取導引**：當 Agent 嘗試一次讀取超過 10MB 的工廠數據時，主動回傳包含「建議指令」的 Error Message：_「數據過大，建議使用 grep 關鍵字搜尋或分段讀取。」_ 這能將模型的錯誤嘗試轉化為有意義的後續動作。

---

## 📡 4. 戰術型「延遲連接」：MCP Gateway 優化

**現狀**：所有設備接口在啟動時即建立連線。

**加固方案 (OH `mcp.ts` 模式)**：
- **Lazy Transport**：針對標準協議（如 HTTP/SSE MCP），僅在 Agent 實際調用該工具時才啟動 Transport。
- **命名空間安全**：針對多個工廠（Site A, Site B）的 MCP 伺服器，自動在 Worker 中將工具重命名為 `siteA_getMotorStatus`。這解決了在工業大數據環境下，同名工具名稱碰撞引發的邏輯錯誤。

---

## 📊 5. 前端狀態感知池 (State Pool) 的工業化應用

**現狀**：UI 狀態分散，難以全局追蹤所有 Agent 的當前進度。

**加固方案 (OH `provider.tsx` 模式)**：
- **中央集權式 Dispatch**：實作一個 `OpenHarnessProvider` 級別的 Context。
- **三維觀測桶 (Industrial Observability Buckets)**：
    1.  **Subagents 監控**：即時顯示 A1-A6 的執行持續時間 (`durationMs`) 與目前的 Path 深度。
    2.  **Session 監控**：顯示當前 Token 消耗水位與壓縮狀態。
    3.  **Sandbox 監控**：追蹤後端 Docker 或 VFS 沙盒的佈署進度（Provisioning）。

---

## 🚀 核心優化：從「顯示日誌」到「控制風險」

| 優化維度 | 之前 (Astra Zenith) | 之後 (Hardened with OH) |
| :--- | :--- | :--- |
| **執行韌性** | 依賴單次 API 成功率。 | 具備「帶有防重複輸出的 Jitter 重試」。 |
| **記憶管理** | 累積數據直到崩潰。 | 使用兩階段（剪枝+摘要）預測性壓縮。 |
| **安全性** | 物理路徑訪問風險。 | 全員強制使用 VFS 沙箱與目錄隔離。 |
| **人機協作** | 同時處理多項任務壓力。 | 具備操作順序審核鎖 (Approval Mutex)。 |

---

> [!IMPORTANT]
> **結語**：透過將 OpenHarness 的 **中間件管線** 與 **VFS 多層隔離** 導入 Astra Zenith，您的系統將不再只是一個網頁儀表板，而是一個具備「自我修復能力」與「工業級安全邊界」的代理作業系統。
