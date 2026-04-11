# Astra Zenith | Industrial Streaming Dashboard

![Astra Zenith Banner](./public/images/tactical_portal_bg.png)

## 🚀 專案概述
**Astra Zenith** 是一款工業級多代理人聯動系統（Agentic OS）。本專案集成了高保真度的實時日誌流、視覺化戰略決策路徑以及智慧型節點佈局，專為 2026 年效能標準打造。

系統採用了獨特的 6-Agent 協作架構（A1-A6），並搭載了 **Harness Engineering v4.0** 治理內核，確保跨代理人資訊傳遞的絕對正確性與邏輯自洽。

---

## 🛡️ Harness Engineering v4.0 (內核治理) - [新增補充]

為了達成航太級的資訊正確性，系統內建 **Harness 治理協議**，對代理人的輸出進行物理級約束：

*   **事實錨點 (Fact Anchoring)**: 透過 `[FACT]` 標籤固化邏輯斷言。A1 定義的事實具備最高「重力權重 (G=10)」，確保戰略基準不被篡改。
*   **變數版本化 (Variable Versioning)**: 支援 `[VARIABLE]: KEY=VALUE` 提取。Harness 會追蹤變數的修改歷史與來源，防止資訊在傳遞過程中退化。
*   **引用完整性校驗 (Citation Integrity)**: 強制執行 `[REF: FX]` 協議。Harness 會主動攔截「不存在的引用」，徹底杜絕 Agent 的資訊幻覺。
*   **交接誠信制度 (Handover Integrity)**: 每一棒代理人必須產出 `[HANDOVER]` 區塊，列出已確定的事實與留給後續節點的技術伏筆。
*   **事實看板 (Truth HUD)**: 前端實時顯示內核固化的 Facts 與 Vars，讓用戶直觀監控「正確性」的累積過程。

---

## 📡 戰術資料交換協議 (AZ-TEP v2026.04)

為了達成 **「架構先行」** 的極速響應，系統強制執行 AZ-TEP 協議：

*   **Scaffold-First 瞬間支撐**: 代理人啟動後必須先輸出 `[STRATEGIC_MAP]`。
*   **幽靈節點 (Ghost Nodes)**: 解析引擎會在 0.1 秒內炸裂展開所有分枝骨架，實現預測性佈局。
*   **任務鎖定 (Mission Lock)**: 系統自動將 A1 分配的 P 點轉化為後續代理人的「唯一執行合約」，終結自說自話。

---

## 🛰️ 戰術模型矩陣 (Tier-Aware Model Matrix)

系統依據 API 金鑰層級自動同步模型陣容。針對 **Gemma 4** 系列，系統實作了「適材適所」的自動化路由：

| 模型系列 | 模型 ID (API String) | 🆓 免費 (Free) | 💎 專業 (Paid) | 架構與能力特點 |
| :--- | :--- | :---: | :---: | :--- |
| **Frontier 3.1** | `gemini-3.1-pro-preview` | ❌ | ✅ | **最強推理**：適合 A1 指揮官進行全域架構規劃。 |
| **Frontier 3.1** | `gemini-3.1-flash-lite` | ✅ | ✅ | **極速傳導**：高配額，適合 A2-A5 進行高頻細節填充。 |
| **Open Gemma** | `gemma-4-31b-it` | ✅ | ✅ | **稠密架構**：所有神經元參與運算，適合高品質代碼生成。 |
| **Open Gemma** | `gemma-4-26b-a4b-it` | ✅ | ✅ | **MoE 架構**：動態啟動 4B 參數，極速推論，Agent 自動化首選。 |
| **Open Gemma** | `gemma-4-e4b-it` | ✅ | ✅ | **Any-to-Any**：PLE 架構，原生支援音頻與多模態事實提取。 |
| **Robotics ER** | `gemini-robotics-er-1.5` | ✅ | ✅ | **具身智能**：針對實體世界邏輯與物理規律深度優化。 |

### 💡 選型與配置建議

#### **1. 架構選型 (Architecture Design)**
*   **處理複雜代碼/長文總結**: 首選 **31B Dense**。它能提供最細緻的邏輯推導，適合 A6 全域審計。
*   **高頻率 Agent 協作**: 首選 **26B MoE (A4B)**。推論速度極快且知識庫深厚，能完美銜接 Harness 的實時同步需求。

#### **2. 部署規模 (Deployment & Scaling)**
*   **中樞級 (A1)**: 建議配置推理能力最強的模型，負責定調並建立高重力事實 (Fact Gravity)。
*   **邊緣級 (Efficient)**: `E4B` 與 `E2B` 適合在低功耗環境下維持內核治理能力，支援原生多模態感知。

---

## 🛠️ 核心功能
- **內核治理看板 (Truth HUD)**: 實時顯示 Harness 固化的事實、變數與協作誠信積分。
- **架構先行心智圖**: 基於 `[STRATEGIC_MAP]` 的預測性節點展開與幽靈節點佔位。
- **PDF 高保真戰術手冊**: 匯出專業級 PDF 報告，含封面、事實索引與結構化內容。
- **自癒型降級鏈路**: API 配額耗盡時，自動觸發「模型黑名單」與「智能冷卻重試」。

## 📦 安裝與運行
1. `npm install`
2. `npm run dev` (Frontend: `5180`)
3. `npm run start` (Backend: `3001`)

---

## 🛡️ 安全協議
- **不留殘留**: 所有 API 金鑰僅暫存於會話中，符合 2026 安全合規標準。
- **內核隔離**: Harness 內核確保不同任務間的變數與事實物理隔離。

---
*Created by Antigravity AI for Astra Zenith Tactical Operations.*
