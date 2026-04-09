# 📖 Gemini Synapse: C2 指令中心操作與開發指南 (v8.1)

本文件引導開發者如何使用、維護與擴展 **blueprint_viewer.html** 高保真觀測站。

---

## 📂 1. 目錄架構 (Module Structure)
為了確保視覺保真度與工程維護性，專案已拆分為以下模組：

*   **`blueprint_viewer.html`**: 主入口引導文件，負責資源鏈結與 HUD 基底。
*   **`src/styles/`**:
    *   `theme.css`: **設計基準 (Tokens)**。控制所有的色彩變數、極光背景、發光強度與 Agent 切換色彩。
    *   `layout.css`: **佈局引擎**。負責網格系統、Header/Footer 比例與視窗容器。
    *   `components.css`: **元件邏輯**。管理「神經脊柱」、「數據模組 (C01-C06)」與雷達掃描動畫。
*   **`src/scripts/`**:
    *   `dashboard.js`: **UI 直屬邏輯**。負責時鐘渲染、Lucide 圖示掛載、以及「戰略情報窗口 (Intel Overlay)」的啟動控制。

---

## 📡 2. 核心交互功能 (Key Interactions)

### 2.1 戰略情報讀取 (Intel Access)
*   **操作方式**：點擊左側神經脊柱最上方的 **[Monitor] 節點**。
*   **機制**：畫面會彈出具備 80px 模糊深度的戰略窗口，顯示目前的架構進化藍圖文件。

### 2.2 主題切換 (Agent Sync)
*   **操作方式**：點擊右下角的三色切換鈕 (`Alpha`, `Beta`, `Delta`)。
*   **效果**：背景極光、各模組的細部發光色將隨之切換，提供角色導航反饋。

### 2.3 實時監測數據 (Data Modules)
*   **C01-C03**: 顯示核心數據、效率與即時流量。
*   **C04 Logistics**: 全球點陣視圖。
*   **C05 Radar**: 360 度 Sonar 掃描儀。

---

## 🛠️ 3. 開發與擴展技巧 (Developer Tips)

### 如何新增一個數據模組 (C07)?
1.  在 `blueprint_viewer.html` 的 `<main class="grid-main">` 中新增一個 `<section class="module">` 標籤。
2.  在 `components.css` 中定義該模組的專屬視覺 (如 SVG 線條或 Canvas)。

### 如何修改全場景模糊度？
*   在 `src/styles/layout.css` 或 `blueprint_viewer.html` 的 `.glass-sheet` / `header` 樣式中調整 `backdrop-filter: blur(80px);` 的參數。

---

## ⚙️ 4. 技術棧依賴 (Dependency Matrix)
*   **Icons**: [Lucide Icons](https://lucide.dev/) (CDN 加載)。
*   **Markdown**: [Marked.js](https://marked.js.org/) (負責渲染情報內容)。
*   **Module System**: ES6 JavaScript Modules (需要具備本地伺服器環境或開發模式以正常 Import)。

---
*文件編號: SYN_C2_GUIDE_PRO_v1.0*
