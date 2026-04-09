import { PortalContext, DIRTY_CONTENT } from '../../az_portal';
import { createAgentPath, buildAgentEvent } from '../../../core/agents';
import { estimateApproximateTokens } from '../../../core/utils';
import type { MissionMessage, PipelineContext } from '../../../core/types';
import type { Agent } from '../../../core/agents';
import { composeMiddlewares, withAuditLog, withRetry, withTokenGuard, withTurnTracking } from '../../../core/middleware';
import type { PortalExecutionTask } from '../PortalTypes';

export class AgentTaskRunner {
    constructor(private context: PortalContext) {}

    public async execute(agentCode: string, round: number, shardingDirective: string, taskMetadata?: PortalExecutionTask): Promise<void> {
        const agent: Agent | undefined = this.context.agentPool.find((a) => a.code === agentCode);
        if (!agent) return;
        
        const maxRetries = 3;
        const tracePath = createAgentPath(agentCode, `ROUND_${round}`, taskMetadata?.nodeName ?? undefined);
        const apiContextMessages = this.context.messages.slice(-12).filter(m => !m.content.includes('ERROR:'));
        
        const pipelineContext: PipelineContext = {
            requestId: `${agentCode}-${round}-${Date.now()}`,
            mission: {
                topic: this.context.activePrompt,
                agents: this.context.tableParticipants.filter((p): p is string => p !== null),
                rounds: this.context.pollingCycles,
                apiKey: this.context.apiKey || undefined,
                mode: this.context.currentTopology === 'custom' ? 'workflow' : 'analysis',
                tracePath
            },
            session: {
                id: this.context._p.selectedArchiveId || `SESSION-${Date.now()}`,
                title: this.context.activePrompt.slice(0, 40) || 'NEW_TACTICAL_MISSION',
                messageCount: this.context.messages.length,
                tokenCount: estimateApproximateTokens(this.context.messages.map(message => message.content).join('\n')),
                compacted: false,
                updatedAt: Date.now()
            },
            path: tracePath,
            messages: this.context.messages,
            events: [buildAgentEvent('status', { state: 'queued' }, tracePath, { agentCode, round })],
            auditTrail: [],
            tokenEstimate: estimateApproximateTokens(this.context.messages.map(message => message.content).join('\n')),
            maxTokens: 12000,
            turnCount: round - 1,
            maxTurns: this.context.pollingCycles,
            retryCount: 0,
            isCompacting: false,
            recordLog: (message: string, type: string = 'INFO') => this.context.pushInternalLog(message, type),
            persistAuditTrail: (trail: string[]) => sessionStorage.setItem('AZ_AUDIT_TRAIL', JSON.stringify(trail)),
            abortSignal: undefined
        };

        const performRequest = async (): Promise<void> => {
            const now = new Date();
            const currentTimestamp = `[LOCAL_TIME]: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} UTC+8`;
            const systemInstruction = `[DENSE_DISPLAY_PROTOCOL]: Minimize redundant line breaks/symbols. Focus on data throughput.`;

            let parentContext = '';
            if (this.context.currentTopology === 'custom' && this.context.n8nFlow && taskMetadata?.nodeName) {
                const parents = Object.entries(this.context.n8nFlow.connections)
                    .filter(([, conn]) => (conn as any).main.some((batch: any) => batch.some((target: any) => target.node === taskMetadata.nodeName)))
                    .map(([source]) => source);

                const parentMessages = pipelineContext.messages.filter(message => message.nodeName && parents.includes(message.nodeName));
                if (parentMessages.length > 0) {
                    parentContext = `\n[PARENT_NODE_DATA]:\n${parentMessages.map(message => `--- FROM [${message.nodeName}] ---\n${message.content}`).join('\n')}`;
                }
            }

            const apiMessages = [
                {
                    role: 'user',
                    content: `${currentTimestamp}\n${systemInstruction}${parentContext}\n[URGENT_TACTICAL_COMMAND]: ${this.context.activePrompt}\n[YOUR_SPECIFIC_FOCUS]: ${shardingDirective}`
                },
                ...apiContextMessages.map(message => ({
                    role: message.agentCode === 'USER' || message.agentCode === 'A1' ? 'user' : 'model',
                    content: message.content
                }))
            ];

            let msgObj: MissionMessage | undefined = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round && message.isStreaming);

            const response = await fetch('/api/generate-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: agentCode, messages: apiMessages })
            });

            if (!response.ok) throw new Error(`STATUS_${response.status}`);

            const reader = response.body?.getReader();
            if (!reader) throw new Error('STREAM_READER_UNAVAILABLE');

            if (!msgObj) {
                msgObj = {
                    agentCode, agentName: agent.name, agentColor: agent.color, agentImg: agent.img,
                    content: '', round, isStreaming: true, nodeName: taskMetadata?.nodeName,
                    path: tracePath, reasoning: ''
                };
                pipelineContext.messages.push(msgObj);
            }

            msgObj.content = '';
            this.context.scheduleRender(DIRTY_CONTENT);
            
            const decoder = new TextDecoder();
            while (true) {
                if (this.context.stopRequested) { await reader.cancel(); break; }
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                msgObj.content += chunk;
                this.context.updateStreamingChunk(agentCode, chunk);
            }
        };

        const runPipeline = composeMiddlewares([
            withAuditLog(`MISSION:${agentCode}`, taskMetadata?.nodeName ?? shardingDirective),
            withTokenGuard(12000, 12),
            withTurnTracking(this.context.pollingCycles),
            withRetry({ maxAttempts: maxRetries, baseDelayMs: 1000 })
        ], async () => {
            this.context.messages = pipelineContext.messages;
            this.context._p.messages = this.context.messages;
            await performRequest();
        });

        try {
            await runPipeline(pipelineContext);
        } catch (err) {
            console.error(`[AGENT_RUNNER_ERROR] ${agentCode}:`, err);
            const msgObj = pipelineContext.messages.find(m => m.agentCode === agentCode && m.round === round);
            if (msgObj) msgObj.isStreaming = false;
        } finally {
            const finalMessage = pipelineContext.messages.find(m => m.agentCode === agentCode && m.round === round);
            if (finalMessage) finalMessage.isStreaming = false;
            this.context.scheduleRender(DIRTY_CONTENT);
        }
    }
}
