import { 
    PortalContext, DIRTY_CONTENT, PortalExecutionTask 
} from '../PortalTypes';
import { createAgentPath, buildAgentEvent } from '../../../core/agents';
import { estimateApproximateTokens } from '../../../core/utils';
import type { PipelineContext } from '../../../core/types';
import type { Agent } from '../../../core/agents';
import { composeMiddlewares, withAuditLog, withRetry, withTokenGuard, withTurnTracking } from '../../../core/middleware';
import { GraphSyncService } from './GraphSyncService';
import { PromptBuilder } from './PromptBuilder';
import { MockTaskRunner } from './MockTaskRunner';

/**
 * AgentTaskRunner — The execution engine for individual agent tactical cycles.
 */
export class AgentTaskRunner {
    private graphSync: GraphSyncService;
    private promptBuilder: PromptBuilder;
    private mockRunner: MockTaskRunner;

    constructor(private context: PortalContext) {
        this.graphSync = new GraphSyncService(context);
        this.promptBuilder = new PromptBuilder(context);
        this.mockRunner = new MockTaskRunner(context);
    }

    public async execute(agentCode: string, round: number, shardingDirective: string, taskMetadata?: PortalExecutionTask): Promise<void> {
        const agent: Agent | undefined = this.context.agentPool.find((a: any) => a.code === agentCode);
        if (!agent) return;
        
        const tracePath = createAgentPath(agentCode, `ROUND_${round}`, taskMetadata?.nodeName ?? undefined);
        const pipelineContext: PipelineContext = {
            requestId: `${agentCode}-${round}-${Date.now()}`,
            mission: { topic: this.context.activePrompt, agents: this.context.tableParticipants.filter((p): p is string => p !== null), rounds: this.context.pollingCycles, apiKey: this.context.apiKey || undefined, mode: this.context.currentTopology === 'custom' ? 'workflow' : 'analysis', tracePath },
            session: { id: this.context._p.selectedArchiveId || `SESSION-${Date.now()}`, title: this.context.activePrompt.slice(0, 40) || 'NEW_TACTICAL_MISSION', messageCount: this.context.messages.length, tokenCount: estimateApproximateTokens(this.context.messages.map(message => message.content).join('\n')), compacted: false, updatedAt: Date.now() },
            path: tracePath, messages: this.context.messages, events: [buildAgentEvent('status', { state: 'queued' }, tracePath, { agentCode, round })],
            auditTrail: [], tokenEstimate: 0, maxTokens: 12000, turnCount: round - 1, maxTurns: this.context.pollingCycles, retryCount: 0, isCompacting: false,
            recordLog: (message: string, type: string = 'INFO') => this.context.pushInternalLog(message, type),
            persistAuditTrail: (trail: string[]) => sessionStorage.setItem('AZ_AUDIT_TRAIL', JSON.stringify(trail)),
            abortSignal: undefined
        };

        const performRequest = async (): Promise<void> => {
            const apiMessages = await this.promptBuilder.build(agentCode, round, shardingDirective);

            let msgObj = pipelineContext.messages.find(m => m.agentCode === agentCode && m.round === round);
            if (!msgObj) {
                msgObj = { agentCode, agentName: agent.name, agentColor: agent.color, agentImg: agent.img, content: '', round, isStreaming: true, nodeName: taskMetadata?.nodeName, path: tracePath, reasoning: '' };
                this.context.messages.push(msgObj);
            }
            msgObj.isStreaming = true;
            this.context.scheduleRender(DIRTY_CONTENT);

            const runStreamRequest = async (attempt: number = 0): Promise<void> => {
                if ((window as any).ZENITH_PREVIEW_MODE) {
                    await this.mockRunner.simulate(agentCode, agent.name, round, msgObj!);
                    return;
                }

                const modelId = (this.context as any)._p.agentModels[agentCode] || 'gemini-3.1-flash-lite-preview';
                try {
                    const response = await fetch('/api/generate-stream', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' }, 
                        body: JSON.stringify({ 
                            agentId: agentCode, 
                            model: modelId, 
                            apiKey: this.context.apiKey, 
                            messages: apiMessages,
                            missionId: (this.context as any)._p.selectedArchiveId
                        }) 
                    });
                    if (!response.ok) throw new Error(`HTTP_${response.status}`);
                    const reader = response.body?.getReader();
                    const decoder = new TextDecoder();
                    let tokenCount = 0;
                    msgObj!.content = '';
                    while (true) {
                        const { done, value } = await reader!.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        
                        if (chunk.includes('"type":"HARNESS_UPDATE"')) {
                            try {
                                const payload = JSON.parse(chunk.replace('data: ', '').trim());
                                if (payload.type === 'HARNESS_UPDATE') (this.context as any).harnessState = payload.state;
                            } catch { /* Noise */ }
                            continue;
                        }

                        msgObj!.content += chunk;
                        tokenCount++;
                        this.context.updateStreamingChunk({ code: agentCode, round }, chunk);
                        // 🚀 PERFORMANCE_FIX: Removed redundant scheduleRender(DIRTY_CONTENT) here.
                        // Direct DOM manipulation in updateStreamingChunk is enough for live text.
                        if (tokenCount % 15 === 0 || chunk.includes('\n')) this.graphSync.sync(agentCode, agent.name, msgObj!.content, round, true);
                    }
                } catch (err: any) {
                    if (attempt < 1) return await runStreamRequest(attempt + 1);
                    msgObj!.content = `[SYSTEM_ERROR]: ${err.message}`;
                }
            };
            await runStreamRequest();
            msgObj.isStreaming = false;
            this.graphSync.sync(agentCode, agent.name, msgObj.content, round);
        };

        const runPipeline = composeMiddlewares([
            withAuditLog(`MISSION:${agentCode}`, taskMetadata?.nodeName ?? shardingDirective),
            withTokenGuard(12000, 12),
            withTurnTracking(this.context.pollingCycles),
            withRetry({ maxAttempts: 3, baseDelayMs: 1000 })
        ], async () => { await performRequest(); });

        try { await runPipeline(pipelineContext); } catch (err) { console.error(err); } finally {
            const finalMessage = pipelineContext.messages.find(m => m.agentCode === agentCode && m.round === round);
            if (finalMessage) finalMessage.isStreaming = false;
            this.context.scheduleRender(DIRTY_CONTENT);
        }
    }
}
