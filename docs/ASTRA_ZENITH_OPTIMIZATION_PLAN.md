# Astra Zenith Streaming 專案優化建議：引入 OpenHarness 工業級代理架構

基於對 OpenHarness (OH) 的深度分析，針對目前的 **Astra Zenith Streaming** 專案，我們建議從「視覺化呈現」轉向「具備復原力與可擴展性的執行內核」。以下是具體的優化方向：

---

## 🏗️ 1. 架構重構：從「指令碼」轉向「中間件管線 (Middleware Pipeline)」

**現狀**：Astra Zenith 的處理邏輯分散在各式 `handlers` 與 `organisms` 中，缺乏統一的執行生命週期。

**建議 (OH 模式)**：
- **引入 `Runner` 模式**：將所有 Agent 的動作（如日誌生成、決策、數據分析）封裝為異步生成器 (`AsyncGenerator<AgentEvent>`)。
- **管線化處理**：使用 `AOP (面向切面編程)` 模式，為所有動作自動注入通行護欄：
    - `withRetry`：處理工廠網路不穩定的 API 調用。
    - `withLogging`：統一收集所有代理的 Trace 資料。
    - `withTurnTracking`：限制單次自動化診斷的對話輪次，防止 Token 逃逸。

---

## 🧠 2. 狀態管理優化：導入「兩階段預測性壓縮」

**現狀**：目前的 Log Stream 是單向增長的陣列。隨著運行時間增加，瀏覽器記憶體與 AI 的 Context Window 將會爆量。

**建議 (OH 模式)**：
- **自動剪枝 (Pruning)**：當 Log 數量超過 100 條時，自動將舊數據的細節「剪枝」，僅保留操作摘要，釋放瀏覽器渲染壓力。
- **預測性摘要 (Compaction)**：在將歷史紀錄送往 AI 解析前，先檢測 Token 消耗。若接近限額，自動調用小型模型進行「對話歸納」，確保長鏈路診斷不因 Context 超限而中斷。

---

## 📡 3. 協議級擴展：採用 `data-oh:` 串流規範

**現狀**：`AZLogStream` 使用簡單的 `{timestamp, type, message}`，無法表達複雜的代理拓樸。

**建議 (OH 模式)**：
- **路徑追蹤 (Path Tracing)**：為每個 Log 注入 `path: string[]`。例如 `["A4 Architect", "A1 Researcher"]`。這能讓 UI 自動渲染出層次化的縮排與連結線，讓用戶明白「誰正在指揮誰」。
- **Reasoning 區塊化**：規範化 AI 的「思考鏈 (Reasoning)」，在 UI 上預設摺疊「內心獨白」，僅展開「操作結果」，大幅提升專業感。

---

## 🛡️ 4. 環境安全與隔離：導入 VFS (虛擬檔案系統) 

**現狀**：目前的 Agent 操作（如 Blueprint 讀取）可能直接依賴物理路徑。

**建議 (OH 模式)**：
- **建立掛載點 (Mount-points)**：所有 Agent 的檔案讀寫必須經過一個 `VfsProvider`。
- **優勢**：即使 Agent 被惡意攻擊，其操作範圍也被限制在 `/workspace` 虛拟目錄內，無法讀取系統機密檔案（如 `.env`）。

---

## 🌳 5. 資源彈性調度：AgentRegistry 與延遲載入 (Lazy Skills)

**現狀**：代理池 `AGENT_POOL` 是靜態載入的，所有規則都在啟動時載入。

**建議 (OH 模式)**：
- **Skills On-demand**：將 A1-A6 的特定專業知識（如 Modbus 協議規範、異常碼對照表）存為 `SKILL.md`。
- **動態注入**：Agent 僅在需要執行特定分析時，才調用 `skill("analyzer")` 載入內容，這能節省 60% 以上的日常 Token 消耗，實現真正的「工業節能」。

---

## 🚦 實施藍圖 (Roadmap)

| 階段 | 重點任務 | 預期效果 |
| :--- | :--- | :--- |
| **Step 1** | 重構 `az_worker_hub.ts` 引入 Middleware 管線。 | 提升系統在 API 震盪時的韌性。 |
| **Step 2** | 更新 `AZLogStream` 支援 `path` 欄位與層階顯示。 | 展現出多代理協作的專業視覺感。 |
| **Step 3** | 實作 `withCompaction` 中間件。 | 解決工業設備長期監控下的「記憶衰退」與「效能卡頓」問題。 |

---

> [!TIP]
> **建議優先從 `withRetry` 與 `withCompaction` 下手。** 這兩者是工業監控系統中最能立竿見影提升「專業度」與「穩定性」的組件。
