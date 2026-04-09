# 🛰️ Astra Zenith: 智慧指針地圖 (MEMORY.md)

### 📌 核心邏輯指針
- **專案目標**：Astra Zenith 高感官討論與串流介面系統。
- **架構模式**：嚴格原子化設計 (Atomic Design) + 單一來源 CSS (Tailwind CSS v4)。
- **前端埠位**：`localhost:5180` (Vite)
- **後端埠位**：`localhost:3001` (Express)
- **核心編排器**：`src/organisms/az_portal.ts` (Web Component + Bitmasking 渲染)。

### 🔍 檔案結構快照 (Optimized)
- `src/organisms/az_portal.ts`: 全域指揮官，管理視圖切換與狀態同步。
- `src/organisms/az_portal_chat_view.ts`: 戰略任務會話主視圖。
- `src/organisms/az_portal_decision_view.ts`: 邏輯拓樸與決策樹可視化。
- `src/organisms/az_portal_archive_view.ts`: 離線任務數據歸檔庫。
- `src/organisms/az_portal_logs_view.ts`: 實時數據日誌串流視圖 (取代 az_log_stream)。
- `src/organisms/az_portal_telemetry_view.ts`: 系統性能監控 HUD。
- `src/organisms/az_portal_seats_view.ts`: 特派員席位矩陣與工作流。
- `src/molecules/m_portal_hud.ts`: 戰術控制列原子組件。
- `src/styles/portal_components.css`: 語義化佈局與 FUI 容器定義。
- `src/scripts/core/agents.ts`: 統一代理人數據來源 (Single Source of Truth)。

### 🕒 對話歷史索引 (Grep Pointers)
- **UPDATE**: `2026-04-05` | 優化：全面清理 Ghost Code，建立 CSS 變數驅動的語義化樣式體系。
- **UPDATE**: `2026-04-05` | 佈局修復：統一視圖渲染簽名，移除 inline styles，恢復全域導航同步。
- **UPDATE**: `2026-04-05` | 結構優化：合併 Agent 定義，移除冗餘 JSON 與 Molecule，清理 root 冗餘檔案。
