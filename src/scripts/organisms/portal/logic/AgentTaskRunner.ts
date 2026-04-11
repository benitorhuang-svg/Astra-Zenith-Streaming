import { 
    PortalContext, DIRTY_CONTENT, PortalExecutionTask 
} from '../PortalTypes';
import { createAgentPath, buildAgentEvent } from '../../../core/agents';
import { estimateApproximateTokens } from '../../../core/utils';
import type { MissionMessage, PipelineContext } from '../../../core/types';
import type { Agent } from '../../../core/agents';
import { composeMiddlewares, withAuditLog, withRetry, withTokenGuard, withTurnTracking } from '../../../core/middleware';

/**
 * AgentTaskRunner — The execution engine for individual agent tactical cycles.
 */
export class AgentTaskRunner {
    constructor(private context: PortalContext) {}

    public async execute(agentCode: string, round: number, shardingDirective: string, taskMetadata?: PortalExecutionTask): Promise<void> {
        const agent: Agent | undefined = this.context.agentPool.find((a: any) => a.code === agentCode);
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
            let parentContext = '';
            // Note: n8nFlow is optional in context
            const ctxAny = this.context as any;
            if (this.context.currentTopology === 'custom' && ctxAny.n8nFlow && taskMetadata?.nodeName) {
                const parents = Object.entries(ctxAny.n8nFlow.connections)
                    .filter(([, conn]) => (conn as any).main.some((batch: any) => batch.some((target: any) => target.node === taskMetadata.nodeName)))
                    .map(([source]) => source);

                const parentMessages = pipelineContext.messages.filter(message => message.nodeName && parents.includes(message.nodeName));
                if (parentMessages.length > 0) {
                    parentContext = `\n[PARENT_NODE_DATA]:\n${parentMessages.map(message => `--- FROM [${message.nodeName}] ---\n${message.content}`).join('\n')}`;
                }
            }

            const agentTacticalPrompt = (this.context as any)._p.agentPrompts[agentCode] || '';

            // Optimization 2026.04: Strict Role Alternation & Part Consolidation
            // Gemini API requires alternating 'user' and 'model' roles. 
            // Consecutive messages of the same role must be merged into a single message with multiple parts.
            
            const rawContext = [
                ...apiContextMessages.map(m => ({
                    role: m.agentCode === 'USER' ? 'user' : 'model',
                    text: m.content
                })),
                {
                    role: 'user',
                    text: `${currentTimestamp}\n${parentContext}\n[URGENT_TACTICAL_COMMAND]: ${this.context.activePrompt}\n\n[YOUR_SPECIFIC_FOCUS]: ${shardingDirective}`
                }
            ];

            const consolidatedContents: any[] = [];
            rawContext.forEach(msg => {
                const last = consolidatedContents[consolidatedContents.length - 1];
                if (last && last.role === msg.role) {
                    last.parts.push({ text: msg.text });
                } else {
                    consolidatedContents.push({
                        role: msg.role,
                        parts: [{ text: msg.text }]
                    });
                }
            });

            // Final Guard: Gemini API requires the conversation to start with 'user'
            if (consolidatedContents.length > 0 && consolidatedContents[0].role === 'model') {
                consolidatedContents.unshift({ role: 'user', parts: [{ text: '[SYSTEM_RESUME_SYNC]' }] });
            }

            const apiMessages = consolidatedContents;

            let msgObj: MissionMessage | undefined = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round && message.isStreaming);

            const modelId = (this.context as any)._p.agentModels[agentCode] || (this.context.apiKey?.toLowerCase() === 'free' ? 'gemini-3.1-flash-lite-preview' : 'gemini-3.1-pro-preview');

            const response = await fetch('/api/generate-stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    agentId: agentCode, 
                    model: modelId, 
                    system_instruction: {
                        parts: [{ text: `${(this.context as any)._p.coreProtocol}\n\n[YOUR_TACTICAL_DATA_PERSONA]:\n${agentTacticalPrompt}` }]
                    },
                    contents: apiMessages,
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 12000,
                        responseMimeType: "text/plain",
                        presencePenalty: 0.0,
                        frequencyPenalty: 0.0,
                        seed: 42
                    },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
                        ]
                })
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
            this.context.messages = pipelineContext.messages.map(m => ({
                ...m,
                isStreaming: !!m.isStreaming // Force to boolean to match ChatMessage requirement
            }));
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
