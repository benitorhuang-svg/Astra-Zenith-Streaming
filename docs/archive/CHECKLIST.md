# Quality Checklist: Astra Zenith Streaming

**Purpose**: 品質閘門檢查清單 — 每個 Phase 完成後必須通過
**Created**: 2026-04-07
**Feature**: [docs/SPEC.md](./SPEC.md)

---

## Architecture Compliance

- [ ] CHK001 所有 UI 組件遵循 Atomic Design 分層 (atoms → molecules → organisms)
- [ ] CHK002 無 Organism 直接引用 Atom 的跨層依賴
- [ ] CHK003 CSS 僅透過 Tailwind v4 `@layer` 管線 (無行內樣式)
- [ ] CHK004 Design Token 統一在 `theme.css` 定義 (無 hardcoded 色值)
- [ ] CHK005 所有 Agent Event 攜帶 `path: string[]` 路徑追蹤

## Security

- [ ] CHK006 所有入站 Payload 經 Zod Schema 校驗
- [ ] CHK007 Agent 檔案操作限制於 VFS 沙箱範圍
- [ ] CHK008 敏感操作配置 Human-in-the-loop 確認機制
- [ ] CHK009 無密碼、API Key 等機密資訊寫入原始碼
- [ ] CHK010 CSP (Content Security Policy) 已配置

## Performance

- [ ] CHK011 TTFT (Time to First Token) < 3 秒
- [ ] CHK012 C2 HUD 六模組同時渲染維持 60fps
- [ ] CHK013 長對話 Token 壓縮率 > 60%
- [ ] CHK014 低功耗設備自動降級 (禁用 dot-matrix、blur)
- [ ] CHK015 靜態資源啟用 Brotli/Gzip 壓縮

## Resilience

- [ ] CHK016 Gemini API 429/503 自動重試 (指數退避 + Jitter)
- [ ] CHK017 Circuit Breaker 在連續失敗 5 次後觸發熔斷
- [ ] CHK018 withTurnTracking 限制單次對話上限
- [ ] CHK019 全鏈路 AbortSignal 支持 (前端取消 → 後端中止)
- [ ] CHK020 n8n 工作流失敗時有錯誤回傳

## Observability

- [ ] CHK021 `.az_core/AGENT_STATE.json` 正確記錄 Agent 狀態
- [ ] CHK022 所有 Prompt 歷史 100% 紀錄於 `.az_core`
- [ ] CHK023 Agent 決策路徑 (CoT) 可在 UI 中查看
- [ ] CHK024 C2 觀測站 Token 消耗指標即時更新

## PWA & Deployment

- [ ] CHK025 Service Worker 正確註冊與快取靜態資源
- [ ] CHK026 `manifest.webmanifest` 包含完整 icon 集
- [ ] CHK027 Lighthouse PWA 分數 > 90
- [ ] CHK028 `vite build` 零錯誤完成
- [ ] CHK029 TypeScript `tsc --noEmit` 零型別錯誤

## Documentation

- [ ] CHK030 ASTRA_ZENITH_ARCH_BLUEPRINT.md 與實作同步
- [ ] CHK031 MODELS_SPEC.md 反映當前模型配置
- [ ] CHK032 CONSTITUTION.md 各原則已遵守
- [ ] CHK033 design_specs/ 中 UI 規格與實際畫面一致

---

## Notes

- 每個 Phase 完成後執行對應區段的 Checklist
- Phase 2 完成後重點檢查: Architecture + Security
- Phase 3 (US1) 完成後重點檢查: Resilience + Observability
- Phase 4 (US2) 完成後重點檢查: Performance
- Final Release 前全部 Checklist 必須通過
