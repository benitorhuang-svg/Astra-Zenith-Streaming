import { PortalContext } from '../PortalTypes';
import { GraphSyncService } from './GraphSyncService';

/**
 * MockTaskRunner — Precision Content Matching Google_Gemma4.html perfectly
 */
export class MockTaskRunner {
    private graphSync: GraphSyncService;

    constructor(private context: PortalContext) {
        this.graphSync = new GraphSyncService(context);
    }

    public async simulate(agentCode: string, agentName: string, round: number, msgObj: any) {
        msgObj.content = '';
        let mockContent: string;

        // 🚀 ROUND_AWARE_MOCK: Content now varies by round to ensure "switching" is visible
        if (round === 1) {
            if (agentCode === 'A1') {
                mockContent = `[TACTICAL_PHASE_1]: 核心架構解析\n\n## 一、 架構設計 (Architecture)\n### 稠密架構 (Dense Model)\n- **代表模型**：31B\n- **運作**：全神經元啟動，提供極致細膩推論\n- **亮點**：導入「思考模式 (Thinking Mode)」大幅提升複雜推理`;
            } else {
                mockContent = `[TACTICAL_PHASE_1]: 任務初始化\n\n## 基礎環境掃描\n- 已確認 Gemma 4 家族模型庫節點已就緒。\n- 目前正在針對 27B 與 410B 模型進行算力預估。\n- 建議優先採用 MoE 架構以降低 VRAM 佔用。`;
            }
        } else if (round === 2) {
            if (agentCode === 'A1') {
                mockContent = `[TACTICAL_PHASE_2]: 深度功能解析\n\n## 二、 模態處理能力 (Modality)\n### 視覺語言與影片理解\n- **支援**：長達 60 秒多幀影片分析\n- **場景**：伺服器端圖表分析、UI 屬性提取\n\n### 全方位音訊支援\n- **技術**：Conformer 架構原生音訊輸入\n- **場景**：邊緣裝置感測器訊號直接解析`;
            } else {
                mockContent = `[TACTICAL_PHASE_2]: 部署環境分析\n\n## 三、 部署規模與硬體 (Deployment)\n- **旗艦中樞**：31B 建議配置 H100 叢集。\n- **高效能邊緣**：E4B 適合 RTX4090 地端工作站。\n- **極致輕量**：E2B 支援樹莓派與智慧型手機。`;
            }
        } else {
            mockContent = `[TACTICAL_PHASE_${round}]: 戰略結論與總結\n\n## 最終建議方案\n1. **企業核心**：31B-it (指令微調版)\n2. **地端開發**：E4B (Effective 4B)\n3. **隱私任務**：E2B (Edge 2B)\n\n[INFO]: 戰略地圖資料已同步至語義圖譜。`;
        }

        const words = mockContent.split(/(\s+)/);
        for (const word of words) {
            msgObj.content += word;
            this.context.updateStreamingChunk({ code: agentCode, round }, word);
            // 🚀 PERFORMANCE_OPTIMIZATION: Disable per-word full re-render
            
            if (msgObj.content.length % 30 === 0 || word.includes('\n')) {
                this.graphSync.sync(agentCode, agentName, msgObj.content, round, true);
            }
            
            await new Promise(r => setTimeout(r, 10));
        }
        
        this.graphSync.sync(agentCode, agentName, msgObj.content, round, false);
    }
}
