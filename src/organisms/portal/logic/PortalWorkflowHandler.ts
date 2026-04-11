import { 
    PortalContext, DIRTY_ALL, DIRTY_SIDEBAR, 
    PortalWorkflowController 
} from '../PortalTypes';
import type { N8NWorkflow } from '../../../integrations/n8n/n8n_data_types';
import { AgentTaskRunner } from './AgentTaskRunner';
import { WorkflowVisualizer } from './WorkflowVisualizer';
import { WorkflowFlowManager } from './WorkflowFlowManager';
import { MissionAPIService } from './MissionAPIService';

/**
 * PortalWorkflowHandler — Orchestrates complex multi-agent flows and topological execution.
 */
export class AZPortalWorkflowHandler implements PortalWorkflowController {
    public n8nFlow: N8NWorkflow | null = null;
    private runner: AgentTaskRunner;
    private visualizer: WorkflowVisualizer;
    private flowManager: WorkflowFlowManager;
    private api: MissionAPIService;

    constructor(private context: PortalContext) {
        this.runner = new AgentTaskRunner(context);
        this.visualizer = new WorkflowVisualizer(context);
        this.flowManager = new WorkflowFlowManager(context);
        this.api = new MissionAPIService();
        this.loadDefaultFlow();
    }

    private async loadDefaultFlow() {
        try {
            const res = await fetch('./n8n_astra_zenith_flow.json');
            this.n8nFlow = res.ok ? await res.json() : this.flowManager.createInitialFlow();
        } catch {
            this.n8nFlow = this.flowManager.createInitialFlow();
        }
        (this.context as any).n8nFlow = this.n8nFlow!;
    }

    public handleAddNode(): void {
        if (!this.n8nFlow) return;
        this.n8nFlow = this.flowManager.addNode(this.n8nFlow);
        this.context.scheduleRender(DIRTY_ALL);
    }

    public addSuccessorNode(_fromNodeName: string): void {
        if (!this.n8nFlow) return;
        this.n8nFlow = this.flowManager.addNode(this.n8nFlow); 
        this.context.scheduleRender(DIRTY_ALL);
    }

    public async importFlow(json: string): Promise<void> {
        try {
            const flow = JSON.parse(json);
            this.n8nFlow = flow;
            (this.context as any).n8nFlow = flow;
            this.context.pushInternalLog('📥 成功載入外部工作流。', 'SUCCESS');
            this.context.scheduleRender(DIRTY_ALL);
        } catch (e) {
            this.context.pushInternalLog(`❌ 匯入失敗: ${e}`, 'ERROR');
        }
    }

    public async handleRunFlow(): Promise<void> {
        if (this.context.isStreaming) return;
        
        const missionId = `AZ-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        this.context.isStreaming = true;
        // 🚀 REFERENCE_SAFETY: Clear the existing array but KEEP the reference
        this.context.messages.length = 0;
        
        const activeArchive: any = {
            id: missionId,
            time: new Date().toLocaleTimeString(),
            mission: 'LIVE_TACTICAL_DATA',
            title: this.context.activePrompt.slice(0, 45) || 'NEW_TACTICAL_MISSION',
            status: 'INITIALIZING',
            size: '0KB',
            messages: this.context.messages 
        };
        this.context.archives.unshift(activeArchive);
        this.context._p.selectedArchiveId = missionId; 
        this.context.scheduleRender(DIRTY_ALL);

        try {
            this.buildExecutionQueue();
            
            // 🚀 HARNESS_INITIATION: Warm up the backend kernel before starting the agent loop
            const participants = this.context.tableParticipants.filter((p): p is string => p !== null);
            await this.api.initiateMission(
                this.context.activePrompt,
                participants,
                this.context.pollingCycles,
                this.context.apiKey,
                [],
                missionId,
                this.context.harnessState
            );

            while (this.context.executionQueue.length > 0) {
                if (this.context.stopRequested) break;
                
                const task = this.context.executionQueue[0];
                
                // 🚀 DYNAMIC_MISSION_ALIGNMENT: Re-shard task focus based on A1's Scaffold
                const missionPoints = (this.context as any).missionPoints;
                if (missionPoints && missionPoints.length > 0 && task.agentCode !== 'A1') {
                    const agentIndex = parseInt(task.agentCode!.replace('A', '')) || 0;
                    const assignedPoint = missionPoints.find((p: any) => p.idCode === `P${agentIndex}`);
                    if (assignedPoint) {
                        task.focus = `[MISSION_LOCK]: 你被指派處理 A1 大綱中的 「${assignedPoint.idCode} | ${assignedPoint.fullTitle}」。請針對此點進行深度專業展開，嚴禁偏離標題。`;
                        this.context.pushInternalLog(`[SYNC]: 代理人 ${task.agentCode} 任務已同步至 ${assignedPoint.idCode}`, 'INFO');
                    }
                }

                this.context.currentPasses = task.round; // 🚀 TELEMETRY_JUMP: Update current round progress
                activeArchive.status = `ACTIVE: ${task.agentCode}`;
                this.context.scheduleRender(DIRTY_SIDEBAR);
                
                await this.runner.execute(task.agentCode, task.round, task.focus, task);
                
                this.context.executionQueue.shift();
                this.context.scheduleRender(DIRTY_ALL);
                if (this.context.executionQueue.length > 0) await new Promise(r => setTimeout(r, 1200));
            }

            activeArchive.status = 'ARCHIVED';
        } catch (e) {
            console.error('[Workflow] Mission Execution Failed:', e);
            activeArchive.status = 'MISSION_FAILED';
        } finally {
            this.context.isStreaming = false;
            this.context.scheduleRender(DIRTY_ALL);
        }
    }

    private buildExecutionQueue() {
        this.context.executionQueue = [];
        
        // 🚀 INDUSTRIAL_SAFETY: Ensure there's at least one agent assigned if in Linear mode
        if (this.context.currentTopology !== 'custom') {
            const activeParticipants = this.context.tableParticipants.filter(Boolean);
            if (activeParticipants.length === 0) {
                console.warn('[Workflow] No agents assigned. Auto-assigning A1 for tactical continuity.');
                this.context.tableParticipants[0] = 'A1';
                this.context.scheduleRender(DIRTY_ALL);
            }
        }

        const n8nFlow = (this.context as any).n8nFlow;
        if (this.context.currentTopology === 'custom' && n8nFlow) {
            n8nFlow.nodes.forEach((node: any) => {
                const agentMatch = this.context.agentPool.find((a: any) => node.name.includes(a.code) || node.type.includes(a.code));
                if (agentMatch) {
                    this.context.executionQueue.push({ 
                        agentCode: agentMatch.code, round: 1, 
                        focus: `NODE: ${node.name}`, nodeName: node.name 
                    });
                }
            });
        } else {
            for (let r = 1; r <= this.context.pollingCycles; r++) {
                this.context.tableParticipants.filter(Boolean).forEach(agentCode => {
                    let focus = 'ANALYSIS';
                    
                    // 🚀 TACTICAL_SHARDING: Map role descriptions to specific focus directives
                    if (agentCode === 'A1') focus = '大規模檢索與徵兆同步';
                    else if (agentCode === 'A2') focus = '模式識別與系統性比對';
                    else if (agentCode === 'A3') focus = '邊緣數據動態與即時環境感知';
                    else if (agentCode === 'A4') focus = '網絡結構重組與封包模擬';
                    else if (agentCode === 'A5') focus = '衝突自動化排除協議';
                    else if (agentCode === 'A6') focus = '預估多重變量下的風險概率與決策收斂';
                    
                    if (r > 1) focus = `基於上一輪發現進行深度 ${focus}`;
                    
                    this.context.executionQueue.push({ 
                        agentCode: agentCode!, round: r, focus: focus 
                    });
                });
            }
        }
    }

    public async handleVisualize(prompt: string): Promise<void> {
        await this.visualizer.visualize(prompt);
    }
}
