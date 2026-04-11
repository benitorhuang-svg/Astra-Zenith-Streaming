# Implementation Plan: Astra Zenith Streaming

**Branch**: `main` | **Date**: 2026-04-07 | **Spec**: [docs/SPEC.md](./SPEC.md)

---

## Summary

Astra Zenith Streaming 是一個基於 Gemini Multi-Agent 的工業級串流觀測平台。
採用 Atomic Design + OpenHarness Middleware Pipeline 混合架構，
透過 Vite 6 + Tailwind v4 建置，以 SSE 協議串流 AI Agent 事件至高保真 C2 HUD。

---

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Vite 6, Tailwind CSS 4, Gemini Unified SDK (@google/genai v1.48.0)
**Storage**: `.az_core` (File-based), node:sqlite (Local Index)
**Testing**: Vite built-in, Manual E2E via C2 HUD
**Target Platform**: Modern Browser (PWA-ready), Node.js 20+ Server
**Project Type**: Web Application (Frontend HUD + Backend Agent Engine)
**Performance Goals**: TTFT < 3s, C2 HUD 60fps, Token compression 70%+ (Context Caching)
**Constraints**: Gemini Free Tier limits (15 RPM, 1500 RPD), Single-user MVP
**Scale/Scope**: 6 Agents, ~50 UI components, 8 views

---

## Constitution Check

| Principle | Status | Notes |
|:---|:---|:---|
| Atomic Design Architecture | ✅ Pass | `atoms/ → molecules/ → organisms/` 已實作 |
| Single-Origin CSS | ✅ Pass | `input.css` → Tailwind v4 管線 |
| Multi-Agent Streaming | ✅ Pass | 已整合 @google/genai 原生串流與並發管理 (4 slots) |
| Token Economy | ✅ Pass | 已實作兩階段壓縮、Context Caching 與 File API 優化 |
| Security-First | ✅ Pass | 已實作 Zod 校驗、VFS 沙箱與 API Gate 隔離 |
| Observable & Auditable | ✅ Pass | `.az_core` 已建立，提供實時 Telemetry |

---

## Project Structure

### Documentation

```text
docs/
├── ASTRA_ZENITH_ARCH_BLUEPRINT.md    # 架構藍圖
├── CONSTITUTION.md                    # 專案準則 (speckit.constitution)
├── SPEC.md                            # 功能規格 (speckit.specify)
├── PLAN.md                            # 實作計畫 (speckit.plan) ← 本文件
├── TASKS.md                           # 任務拆解 (speckit.tasks)
├── CHECKLIST.md                       # 品質檢查清單 (speckit.checklist)
├── MODELS_SPEC.md                     # 模型架構與編排
├── architecture_design_guidelines.md  # CSS 架構指南
├── ASTRA_ZENITH_IMPLEMENTATION_GUIDE.md  # OH 實作指南
├── ASTRA_ZENITH_INDUSTRIAL_HARDENING.md  # 工業加固方案
├── ASTRA_ZENITH_OPTIMIZATION_PLAN.md     # 優化方案
├── archive/                           # 歸檔文件
└── design_specs/                      # UI 設計規格
```

### Source Code

```text
Astra Zenith Streaming/
├── src/
│   ├── scripts/
│   │   ├── atoms/                # a_avatar.ts, a_tactical_button.ts, brackets.ts
│   │   ├── molecules/            # m_agent_unit.ts, m_portal_hud.ts, m_portal_content_*.ts
│   │   ├── organisms/            # az_portal.ts, az_header.ts, az_hud.ts, az_portal_*_view.ts
│   │   ├── core/                 # agents.ts, identity.ts, utils.ts
│   │   └── integrations/         # n8n/
│   └── styles/
│       ├── input.css             # Tailwind 入口
│       ├── theme.css             # Design tokens
│       ├── atoms.css / molecules.css / organisms.css
│       ├── portal_components.css
│       ├── overrides.css
│       └── vfx.css
├── public/
│   ├── blueprints/
│   └── images/
├── .az_core/                     # 持久化記憶
├── blueprint_viewer.html         # C2 HUD 入口
├── sw.js                         # Service Worker
├── manifest.webmanifest
├── vite.config.ts
└── package.json
```

---

## Architecture Decisions

### Decision 1: Middleware Pipeline (OH-Inspired)

新增 `src/scripts/core/middleware.ts`，將 Agent 執行管線抽象為可組合中間件：
- `withRetry` — 指數退避 + 隨機抖動
- `withTokenGuard` — 兩階段壓縮
- `withTurnTracking` — 輪次限制
- `withAuditLog` — 全鏈路追蹤

### Decision 2: Agent Event Protocol

擴展現有事件格式，加入 `path` 追蹤與 `data-oh:` 命名空間：
```typescript
interface AZAgentEvent {
  path: string[];
  type: 'text' | 'tool-call' | 'reasoning' | 'status';
  payload: unknown;
  timestamp: number;
}
```

### Decision 3: Lazy Skills

將 Agent 專業知識從靜態載入改為按需注入，透過 `skill(name)` 函式動態載入 Markdown 內容。

---

## Risk Assessment

| Risk | Impact | Mitigation |
|:---|:---|:---|
| Gemini Free Tier 限額不足 | 高 | Gemma 4 26B 備援 + Token 壓縮 |
| C2 HUD 渲染效能瓶頸 | 中 | Shader 降級 + requestAnimationFrame 節流 |
| 長對話 Token 溢出 | 高 | 兩階段壓縮 + 對話輪次上限 |
| n8n 工作流失敗 | 低 | 錯誤回傳 + Retry 機制 |
