"use strict";
/**
 * 🛰️ ASTRA ZENITH: 2026 PREVIEW MOCK DATA
 * Standardized tactical dataset for Full Preview Mode.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOCK_GRAPH_DATA = exports.MOCK_SCRIPTS = exports.MOCK_AGENTS = exports.MOCK_MODELS = void 0;
exports.MOCK_MODELS = [
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite-preview',
    'gemma-4-31b-it',
    'gemma-4-26b-a4b-it',
    'gemma-4-e4b-it',
    'gemma-4-e2b-it',
    'gemini-robotics-er-1.5-preview'
];
exports.MOCK_AGENTS = [
    { id: 'A1', name: 'Researcher', role: '探索者', model: 'gemma-4-26b-a4b-it' },
    { id: 'A2', name: 'Analyzer', role: '解析者', model: 'gemini-3.1-pro-preview' },
    { id: 'A3', name: 'Code_Gen', role: '架構師', model: 'gemma-4-e4b-it' },
    { id: 'A4', name: 'Refiner', role: '優化師', model: 'gemma-4-26b-a4b-it' },
    { id: 'A5', name: 'Auditor', role: '審計員', model: 'gemma-4-31b-it' },
    { id: 'A6', name: 'Manager', role: '指揮官', model: 'gemini-3.1-pro-preview' }
];
exports.MOCK_SCRIPTS = {
    A1: `【2026 戰術預覽: 研究員】\n我們已經針對當前任務啟動了「深海採集協議」。目前已檢索到 10 個核心數據點。\n\n【解說】針對分散式節點的延遲，我們發現 MoE 架構在高負載下會產生約 15% 的偏斜。這是由於 Token Routing 在不同專家模型間的權重分配不均導致的。我們需要建立一個動態緩衝區來穩定這種波動。\n\n【Summary】A1 採集完成：延遲數據已同步至圖譜。`,
    A2: `【2026 戰術預覽: 解析者】\n針對 A1 提供的延遲數據，我們進行了 5 維度的變數分析。\n\n【解說】核心變數為「併發競爭力」。當併發請求超過 12 RPM 時，系統會自動觸發 429 攔截。這是一個硬性的物理邊界，必須透過序列化調度來解決。我們的對抗性分析顯示，過往的並行策略在 2026 年的 API 環境下已不再適用。\n\n【Summary】A2 分析完成：建議採取 1 Concurrent 序列化策略。`,
    A3: `【2026 戰術預覽: 架構師】\n技術實施架構已就緒。我們將採用「單線程指令流」來規避併發衝突。\n\n【解說】架構核心在於 AgentTaskRunner 的中間件管道。我們將 Retry, Token, 與 Audit 邏輯完全解耦。代碼如下：\n\`\`\`typescript\nconst pipeline = compose([retry, audit], finalExecute);\n\`\`\`\n這能確保每一次 API 請求都是在受控狀態下發出的，即使發生 503 錯誤，也能透過指數退避重試穩定恢復。\n\n【Summary】A3 架構就緒：已部署 503 防禦機制。`,
    A4: `【2026 戰術預覽: 優化師】\n所有技術語言已完成「戰鬥美學」昇華。內容豐富度擴充至 150%。\n\n【解說】我們不僅在解決技術問題，還在構建一套「邏輯藝術品」。每個戰術節點的文字都經過細緻的節奏調整，確保在前端流式輸出時具備極佳的視覺衝擊力。數據與敘事的平衡是我們追求的最高準則。\n\n【Summary】A4 優化完成：戰略敘事鏈已達生產級標準。`,
    A5: `【2026 戰術預覽: 審計員】\n警告！目前的方案存在 3 處安全性邊界漏洞。我們必須進行毀滅性的邏輯測試。\n\n【解說】漏洞 1：模擬環境下的身分偽裝。如果使用者在 Preview 模式下試圖越權存取真實數據，系統必須立即觸發 Session 銷毀。漏洞 2：指數退避的最大等待時間過長，可能導致使用者體驗崩潰。必須設定 Hard Timeout。\n\n【Summary】A5 審計完成：已標註 5 處修正點。`,
    A6: `【2026 戰術預覽: 指揮官】\n全代理人任務已收斂。系統進入穩態維護模式。\n\n【解說】透過對 A1-A5 的無損合成，我們得出最終戰術路徑：在 2026 年的高壓 API 時代，唯有透過「極致的穩定性控制」與「精細的知識層次映射」才能實現真正的 Agentic 自主。我們已將所有細碎討論合成為一個核心戰略模組。\n\n【Summary】任務圓滿達成：ASTRA ZENITH 系統全域同步。`
};
exports.MOCK_GRAPH_DATA = {
    nodes: [
        { id: 'root-001', title: '2026 多代理人協議演進', type: 'ROOT', agentCode: 'SYSTEM', x: 500, y: 500, content: '核心主題：探討分散式 AI 叢集的同步與衝突解決機制。' },
        { id: 'branch-A1', title: 'A1 數據採集階段', type: 'BRANCH', agentCode: 'A1', parentId: 'root-001', x: 400, y: 400, content: '已檢索到 10 個核心數據點。' },
        { id: 'leaf-A1-1', title: '延遲分布數據', type: 'LEAF', agentCode: 'A1', parentId: 'branch-A1', x: 350, y: 350, content: '【解說】當前 MoE 模型延遲分布...' },
        { id: 'branch-A2', title: 'A2 邏輯建模分析', type: 'BRANCH', agentCode: 'A2', parentId: 'root-001', x: 600, y: 400, content: '針對 A1 素材進行分析。' },
        { id: 'branch-A5', title: 'A5 對抗式審計', type: 'BRANCH', agentCode: 'A5', parentId: 'root-001', x: 500, y: 650, content: '檢測到安全性漏洞。' }
    ],
    links: [
        { source: 'root-001', target: 'branch-A1', type: 'HIERARCHICAL', value: 1 },
        { source: 'root-001', target: 'branch-A2', type: 'HIERARCHICAL', value: 1 },
        { source: 'root-001', target: 'branch-A5', type: 'HIERARCHICAL', value: 1 },
        { source: 'branch-A1', target: 'leaf-A1-1', type: 'HIERARCHICAL', value: 1 }
    ]
};
