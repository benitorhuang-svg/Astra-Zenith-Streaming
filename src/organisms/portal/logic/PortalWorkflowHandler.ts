import { 
    PortalContext, DIRTY_ALL, DIRTY_SIDEBAR, 
    PortalWorkflowController 
} from '../PortalTypes';
import type { N8NWorkflow } from '../../../integrations/n8n/n8n_data_types';
import { AgentTaskRunner } from './AgentTaskRunner';
import { WorkflowVisualizer } from './WorkflowVisualizer';
import { WorkflowFlowManager } from './WorkflowFlowManager';

/**
 * PortalWorkflowHandler — Orchestrates complex multi-agent flows and topological execution.
 */
export class AZPortalWorkflowHandler implements PortalWorkflowController {
    public n8nFlow: N8NWorkflow | null = null;
    private runner: AgentTaskRunner;
    private visualizer: WorkflowVisualizer;
    private flowManager: WorkflowFlowManager;

    constructor(private context: PortalContext) {
        this.runner = new AgentTaskRunner(context);
        this.visualizer = new WorkflowVisualizer(context);
        this.flowManager = new WorkflowFlowManager(context);
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
        this.context.messages = [];
        
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
            
            while (this.context.executionQueue.length > 0) {
                if (this.context.stopRequested) break;
                
                const task = this.context.executionQueue[0];
                activeArchive.status = `ACTIVE: ${task.agentCode}`;
                this.context.scheduleRender(DIRTY_SIDEBAR);
                
                await this.runner.execute(task.agentCode, task.round, task.focus, task);
                
                this.context.executionQueue.shift();
                this.context.scheduleRender(DIRTY_ALL);
                if (this.context.executionQueue.length > 0) await new Promise(r => setTimeout(r, 1200));
            }

            activeArchive.status = 'ARCHIVED';
        } catch {
            activeArchive.status = 'MISSION_FAILED';
        } finally {
            this.context.isStreaming = false;
            this.context.scheduleRender(DIRTY_ALL);
        }
    }

    private buildExecutionQueue() {
        this.context.executionQueue = [];
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
                    this.context.executionQueue.push({ agentCode: agentCode!, round: r, focus: 'ANALYSIS' });
                });
            }
        }
    }

    public async handleVisualize(prompt: string): Promise<void> {
        await this.visualizer.visualize(prompt);
    }
}
