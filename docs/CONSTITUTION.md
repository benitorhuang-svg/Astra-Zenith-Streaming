# Astra Zenith Streaming Constitution

## Core Principles

### I. Atomic Design Architecture
所有 UI 組件必須遵循 Atomic Design 分層：Atoms → Molecules → Organisms。
- 組件必須獨立可測、可複用
- 每個層級只能引用同級或更低層級的組件
- 禁止 Atoms 直接引用 Organisms

### II. Single-Origin CSS (Tailwind v4)
CSS 僅有一個處理管線：Tailwind v4 `@layer` 系統。
- 所有樣式必須經由 `input.css` → Tailwind Compiler
- 四層級優先順序：`base < theme < components < utilities`
- 禁止行內樣式或第二套 CSS 管線

### III. Multi-Agent Streaming Protocol
Agent 通訊必須遵循結構化串流協議。
- 所有 Agent Event 必須攜帶 `path: string[]` 路徑追蹤
- 前端與後端之間僅透過 SSE (Server-Sent Events) 通訊
- Agent 間以 JSON Mode 交換 Metadata

### IV. Token Economy & Context Guardianship
Token 消耗必須受到系統級監控與控制。
- 實作兩階段壓縮：Pruning → Summarization
- 所有長對話必須配置 Token 上限 (withTurnTracking)
- Gemini API 調用必須配備 Circuit Breaker

### V. Security-First Design
所有外部交互必須通過安全邊界。
- Zod Schema 校驗所有入站 Payload
- Agent 檔案操作限制於 VFS 沙箱
- 敏感操作需 Human-in-the-loop 確認

### VI. Observable & Auditable
系統行為必須完全可觀測與可追蹤。
- 所有 Prompt 生產歷史 100% 紀錄
- Agent 決策路徑 (Chain-of-Thought) 完整可視化
- `.az_core` 作為長效記憶體的持久化底座

## Technology Stack

| 層級 | 技術 | 版本 |
|:---|:---|:---|
| Build | Vite | 6.x |
| CSS | Tailwind CSS | 4.x |
| Language | TypeScript | 5.x |
| AI Models | Gemini 3 Flash / 3.1 Flash-Lite | 2026 Q2 |
| Image Gen | Imagen 4.0 Ultra | 2026 |
| Workflow | n8n | Latest |
| PWA | Service Worker | Native |

## Development Workflow

1. **Spec-First**：所有功能必須先撰寫 Spec，經審查後才開始實作
2. **Atomic Commits**：每個提交對應一個邏輯單元
3. **Design Token 驅動**：視覺變更從 `theme.css` 的 CSS 變數開始
4. **Agent 行為文件化**：新增 Agent 能力時必須更新 `MODELS_SPEC.md`

## Governance

- 本 Constitution 優先於所有其他開發慣例
- 修正需附帶文檔說明、遷移計畫與團隊審核
- 使用 `ASTRA_ZENITH_ARCH_BLUEPRINT.md` 作為運行時開發指引

**Version**: 1.0 | **Ratified**: 2026-04-07
