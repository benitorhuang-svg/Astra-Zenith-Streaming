# Astra Zenith | Industrial Streaming Dashboard

![Astra Zenith Banner](/c:/Users/benit/Desktop/Astra%20Zenith%20Streaming/public/images/tactical_portal_bg.png)

## 🚀 專案概述
**Astra Zenith** 是一款工業級多代理人聯動系統（Agentic OS）。本專案集成了高保真度的實時日誌流、視覺化戰略決策路徑以及智慧型節點佈局，專為 2026 年效能標準打造。

系統採用了獨特的 6-Agent 協作架構（A1-A6），能夠同時處理複雜的指令分發、語義分析與自動化工作流。

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
| **Open Gemma** | `gemma-4-it` | ✅ | ✅ | **輕量開放**：Google 最新開放權重模型，適合基礎任務 |

### 🚀 限制與配額 (v2026.04 實時數據)
- **免費模式 (Free)**: 
    - 基礎配額: 15 RPM / **1,500 RPD (每日限制)**。
    - **Robotics-ER 限制**: 單日上限為 **500 RPD** (此額度與 Flash-Lite 共用 1,500 總額)。
    - **Gemma 4**: 目前為免費試用階段，不佔用核心 Gemini RPD 配額。
- **專業模式 (Paid)**: **2,000 RPM (Flash)** / **360 RPM (Pro)**。**無每日上限 (Unlimited RPD)**。

> [!CAUTION]
> **標準型 Gemini 1.5 與 2.0 系列已正式終止支援 (EOL)**。系統僅保留專用型 `Robotics-ER 1.5` 與開放型 `Gemma 4` 供特定戰術拓撲調用。

---

## 🛠️ 核心功能
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
