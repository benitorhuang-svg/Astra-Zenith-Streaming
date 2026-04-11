# Astra Zenith | Industrial Streaming Dashboard

![Astra Zenith Banner](./public/images/tactical_portal_bg.png)

## 🚀 專案概述
**Astra Zenith** 是一款工業級多代理人聯動系統（Agentic OS）。本專案集成了高保真度的實時日誌流、視覺化戰略決策路徑以及智慧型節點佈局，專為 2026 年效能標準打造。

系統採用了獨特的 6-Agent 協作架構（A1-A6），能夠同時處理複雜的指令分發、語義分析與自動化工作流。

---

## 🛰️ 戰術入口設計模式 (Entry Protocol) - [新增補充]

系統嚴格區分為兩種獨立的作業模式，請根據需求選擇正確的入口：

### 1. 預覽模式 (Preview Mode) - **演示專用**
*   **入口**：點擊首頁左側高亮按鈕 **「Preview Mode」**。
*   **行為**：系統進入 `ZENITH_PREVIEW_MODE`。所有通訊將被本地攔截，直接輸出內建的 `MOCK_SCRIPTS` 戰術劇本。
*   **用途**：UI/UX 展示、離線功能測試，不消耗任何 API 配額。

### 2. 金鑰模式 (Key Mode) - **實戰做事**
*   **入口**：於 `Gemini_Key` 輸入框置入有效的 API 金鑰，點擊 **「INITIALIZE_STATION」**。
*   **行為**：系統建立真實的 Socket 與 Fetch 鏈路。根據金鑰層級自動同步模型矩陣。
*   **模型自動化路由 (Tier-Aware)**: 
    *   **FREE (免費)**: 自動對應 **Gemma 4** 與 **Frontier 3.1 Flash Lite** 矩陣。
    *   **PAID (付費)**: 全面解鎖 **Frontier 3.1 Pro** 與 **Stable 2.5 Pro**。

---

## 📡 戰術資料交換協議 (AZ-TEP v2026.04) - [新增補充]

為了達成 **「架構先行」** 的極速響應，系統強制執行 AZ-TEP 協議進行數據交換：

*   **Scaffold-First 瞬間支撐**: 代理人啟動後第一動作必須輸出 `[STRATEGIC_MAP]`。解析引擎會在收到標記的 **0.1 秒內** 炸裂展開所有分枝骨架，實現預測性 UI 佈局。
*   **規範化標籤格式**: 採用 `[IDCode] | [UI_Short_Title] | [Full_Strategic_Header]` 格式。
    *   **IDCode**: P1-P6 (核心點) / D1-D10 (細節點)。
    *   **UI_Short_Title**: 專用於圖譜節點顯示的精煉標題（確保分枝清晰，避免重複）。
*   **向心力收斂邏輯 (Convergence)**: 系統自動偵測各代理人的執行邊界，並生成 **SUMMARY 總結節點**。所有分枝會重新連結至此節點，消除心智圖的零散感，呈現閉環戰略。
*   **角色交替強制化**: 系統會自動進行 `Role Consolidation`，確保 API 序列嚴格遵循 `user` <-> `model` 模式。
*   **EOL 封鎖**: 嚴格封鎖 Gemini 1.5/2.0 (EOL) 請求，僅支援 Frontier 3.x 與 Gemma 4。

---

## 🛰️ 戰術模型矩陣 (Tier-Aware Model Matrix)

系統會依據驗證之 API 金鑰自動偵測層級，並於「戰術分配」界面開放對應的模型選項。

> [!TIP]
> **自動化同步機制**: 系統通過 API 驗證後，會即時更新後端 6-Agent 協作池中的所有活躍代理模型，無需重啟伺服器即可完成從 Free 到 Paid 層級的平滑切換。


| 模型系列 | 模型 ID (API String) | 🆓 免費模式 (Free) | 💎 專業模式 (Paid) | 能力特點 |
| :--- | :--- | :---: | :---: | :--- |
| **Frontier 3.1** | `gemini-3.1-pro-preview` | ❌ | ✅ | **最強推理能力**：複雜邏輯與代理協作 |
| **Frontier 3.1** | `gemini-3.1-flash-lite-preview` | ✅ | ✅ | **高配額優化**：極速執行、大規模處理 |
| **Frontier 3** | `gemini-3-flash-preview` | ✅ | ✅ | **Agentic 優化**：平衡連線延遲與智能 |
| **Stable 2.5** | `gemini-2.5-pro` | ❌ | ✅ | **工業級穩定**：深度程式設計與邏輯推理 |
| **Stable 2.5** | `gemini-2.5-flash` | ✅ | ✅ | **高處理量**：百萬詞元脈絡穩定支援 |
| **Stable 2.5** | `gemini-2.5-flash-lite` | ✅ | ✅ | **極致效率**：最小化 Token 成本耗損 |
| **Robotics ER** | `gemini-robotics-er-1.5-preview` | ✅ | ✅ | **具身智能**：思考型模型，實體世界互動優化 |
| **Open Gemma** | `gemma-4-31b-it` | ✅ | ✅ | **旗艦效能**：31B 全參數，支持 256K 上下文與 60s 視頻分析 |
| **Open Gemma** | `gemma-4-26b-a4b-it` | ✅ | ✅ | **極速推理**：26B MoE 架構，256K 上下文，適合高吞吐量數據採集 |
| **Open Gemma** | `gemma-4-e4b-it` | ✅ | ✅ | **邊緣強效**：4.5B PLE 架構，支持原生音頻輸入與 128K 上下文 |
| **Open Gemma** | `gemma-4-e2b-it` | ✅ | ✅ | **極致輕量**：2.3B PLE 架構，專為手機/嵌入式端優化 |

### 🚀 限制與配額 (v2026.04 實時數據)
- **免費模式 (Free)**: 
    - 基礎配額: 15 RPM / **1,500 RPD (每日限制)**。
    - **Robotics-ER 限制**: 單日上限為 **500 RPD** (此額度與 Flash-Lite 共用 1,500 總額)。
    - **Gemma 4**: 目前為免費試用階段，不佔用核心 Gemini RPD 配額。支持原生多模態 (Text, Image, Audio, Video)。
- **專業模式 (Paid)**: **2,000 RPM (Flash)** / **360 RPM (Pro)**。**無每日上限 (Unlimited RPD)**。

> [!CAUTION]
> **標準型 Gemini 1.5 與 2.0 系列已正式終止支援 (EOL)**。系統僅保留專用型 `Robotics-ER 1.5` 與開放型 `Gemma 4` 供特定戰術拓撲調用。

### 💡 戰術配置建議 (Tactical Configuration Recommendations)

#### **🎯 核心原則：架構先行 (Scaffold-First)**
系統採用「預測性節點擴展」技術。不論模型等級，所有代理人第一動作皆為輸出 `[STRATEGIC_MAP]` 以瞬間展開心智圖分枝。

*   **最強第一棒原則 (Strongest First Strike)**: 
    建議將 **A1 (COMMANDER)** 配置為當前 Tier 下 **推理能力最強** 的模型（如 Paid 模式下的 Frontier 3.1 Pro 或 Free 模式下的 Gemma 4）。
*   **作用**: 第一棒代理人決定了任務的整體邏輯地基，強模型能產出更具深度、更符合「 Topic -> Point -> Content」結構的核心技能樹。

#### **🆓 免費模式 - 「配額極致化」策略**
*   **前端架構與引導 (A1)**: 使用 **`Gemma 4`**。
    *   *優勢*: 最強推理，負責定調並建立 Scaffold。目前為試用階段，不佔用核心配額。
*   **物理觀察與感測 (A3)**: 使用 **`Robotics-ER 1.5`**。
    *   *優勢*: 擁有獨立的 500 RPD 配額，能有效替核心隊列分流。
*   **核心決策與收斂 (A2, A4, A5, A6)**: 使用 **`Frontier 3.1 Flash Lite`**。
    *   *優勢*: 15 RPM 下響應最快且邏輯嚴整，是填充戰術細節的中堅力量。

#### **💎 專業模式 - 「全域高精度」策略**
*   **全矩陣滿員**: 建議全員配置 **`Frontier 3.1 Pro`**。
    *   *優勢*: 360 RPM 且無每日上限，能支撐最複雜的邏輯推演與跨 Agent 場景。
*   **極大規模掃描**: 若需同時處理 10 個以上工作流，請切換至 **`Frontier 3.1 Flash`**。
    *   *優勢*: 擁有高達 2,000 RPM 的吞吐量，適合自動化壓力測試。

---

## 🛠️ 核心功能
- **架構先行心智圖 (Scaffold Mindmap)**: 支援基於 `[STRATEGIC_MAP]` 的預測性節點展開與向心力收斂渲染。
- **PDF 高保真戰術手冊**: 匯出「可直接使用」的專業 PDF 報告，包含封面頁、戰略索引與層級化內容。
- **主題對話 / 虛擬劇本**: 支援多代理人實時串流對話，並具備推理過程（Reasoning）的視覺化展示。
- **戰略路徑 (Pathway)**: 以心智導圖形式呈現 AI 的決策邏輯，支援動態節點擴展。
- **實時遠測 (Telemetry)**: 監控 Token 消耗、通訊延遲及各代理人工作負擔。
- **自訂工作流 (Workflow)**: 支援 N8N 相容的節點邏輯，可自由定義自動化任務。

## 📦 安裝與運行
1. 安裝依賴: `npm install`
2. 啟動開發伺服器: `npm run dev`
3. 預覽地址: `http://localhost:5180`
4. 後端伺服器: `http://localhost:3001`

---

## 🛡️ 安全協議
- **不留殘留**: 所有 API 金鑰僅暫存於當前瀏覽器 Session 與伺服器記憶體中，關閉分頁即銷毀。
- **零數據持久化**: 本系統不使用任何資料庫存儲敏感命令或金鑰，完全符合 2026 安全合規標準。

---
*Created by Antigravity AI for Astra Zenith Tactical Operations.*
