# Astra Zenith Streaming: OpenHarness 工業化實作技術指南 (Technical Implementation Guide)

本文件提供了將 OpenHarness (OH) 的「工業底座」架構實作到 Astra Zenith 專案中的具體代碼範式與重構指南。

---

## 🛠️ 1. 從「手動 SSE」轉向「協議感知型 Worker」

**目標**：重構 `az_worker_hub.ts`，使其能處理 OH 的 `data-oh:*` 協議並支援背景狀態管理。

### 📌 代碼範式 (az_worker_hub.ts 重構預覽)

```typescript
/**
 * 工業級數據管線：背景解析器 (V3 - OH Protocol Aware)
 */
import { AgentEvent } from '@openharness/core';

let sseSource: EventSource | null = null;
const state = {
    subagents: new Map<string, { status: string, start: number }>(),
    currentTurn: 0,
    isCompacting: false
};

self.onmessage = (e) => {
    const { action, url } = e.data;
    if (action === 'INIT_MISSION') {
        const ev = new EventSource(url);
        ev.onmessage = (event) => {
            if (event.data.startsWith('data-oh:')) {
                handleOHProtocol(event.data);
            } else {
                // 標準日誌處理
                self.postMessage({ type: 'LOG', payload: JSON.parse(event.data) });
            }
        };
    }
};

function handleOHProtocol(data: string) {
    if (data.startsWith('data-oh:subagent.start')) {
        const payload = JSON.parse(data.slice(22));
        state.subagents.set(payload.path.join('/'), { status: 'RUNNING', start: Date.now() });
        self.postMessage({ type: 'AGENT_SYNC', subagents: Array.from(state.subagents.entries()) });
    }
    
    if (data.startsWith('data-oh:compaction.start')) {
        state.isCompacting = true;
        self.postMessage({ type: 'STATUS_SYNC', isCompacting: true });
    }
    // ... 其他 OH 協議解析
}
```

---

## 🧬 2. 實作「兩階段預防性壓縮」中間件 (Predictive Compaction)

**目標**：在 `MissionAPIService` 調用後端時，確保長週期任務不因 Token 溢出中斷。

### 📌 配置範式 (後端 API 邏輯)

```typescript
import { withCompaction, withRetry, createRunner } from '@openharness/core';

// 為工業診斷定義兩階段策略
const industrialCompaction = withCompaction({
    strategy: 'summarize', // 當剪枝無效時生成摘要
    threshold: 0.85,       // 當 Context 滿 85% 時觸發
    pruneToolResults: true // 優先刪除大型感測器 Dump 資料
});

// 組裝管線
const diagnosticRunner = pipe(
    withRetry({ maxRetries: 3, jitter: true }),
    industrialCompaction,
    withTurnTracking()
)(baseRunner);
```

---

## 🔒 3. 工業檔案系統隔離 (VFS Providers)

**目標**：保護工廠 PLC 配置與 Blueprint 檔案。

### 📌 實作範式 (Provider 定義)

```typescript
import { NodeFsProvider, createFsTools } from '@openharness/core';

// 建立受限的工業工作區
const industrialProvider = new NodeFsProvider({
    // 強制將 Agent 鎖死在特定目錄下
    baseDir: path.resolve(process.cwd(), './public/blueprints'),
    // 設定單次讀取限額（OH 護欄）
    maxReadSize: 1024 * 50 // 50KB
});

const tools = createFsTools(industrialProvider);
```

---

## 🚦 4. 開發者遷移檢核表 (Migration Checklist)

1.  **[ ] 協議對接**：前端 `az_log_stream.ts` 需新增對 `path` 欄位的渲染邏輯（縮排顯示）。
2.  **[ ] Worker 升級**：將 `az_worker_hub.ts` 升級為支援 `data-oh:` 標籤的解析器，並透過 `postMessage` 同步 Agent 生命週期。
3.  **[ ] 中間件注入**：在後端 Agent 執行流程中加入 `withCompaction` 中間件，解決長時間診斷導致的「記憶黑洞」。
4.  **[ ] 安全審核**：將原本直接使用 `fs` 的工具替換為 OH 的 `createFsTools` 並綁定 `NodeFsProvider` 以實現目錄隔離。

---

## 🚀 預期收益：工業化轉型

| 維度 | 優化前 | 優化後 (OpenHarness Pattern) |
| :--- | :--- | :--- |
| **記憶體消耗** | 直線增長，大日誌下 UI 凍結。 | 具備背景 Worker 解析與自動兩階段壓縮。 |
| **通訊穩健性** | SSE 斷斷續續。 | 具備全鏈路 `Abort` 與「帶抖動的自動重試」。 |
| **數據感知度** | 黑盒式 Agent 執行。 | 即時感知子代理拓樸與執行路徑 (`path`)。 |
| **安全邊界** | 可能讀取到敏感代碼/配置。 | 硬性目錄鎖死 (VFS Jail) 與位元組位限。 |

---

> [!TIP]
> **建議先從小規模測試 `withCompaction` 開始。** 在高頻率的數據串流中，對話歷史的精簡程度將直接決定 Agent 的反應速度與推理準確度。
