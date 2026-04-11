import { 
    PortalContext, DIRTY_CONTENT, PortalExecutionTask 
} from '../PortalTypes';
import { createAgentPath, buildAgentEvent } from '../../../core/agents';
import { estimateApproximateTokens } from '../../../core/utils';
import type { PipelineContext } from '../../../core/types';
import type { Agent } from '../../../core/agents';
import { MOCK_SCRIPTS } from '../../../core/MOCK_DATA';
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

            let msgObj = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round && message.isStreaming);

            // 🚀 FULL_MOCKUP_INTERCEPTION: Bypass API if in Preview Mode
            if ((window as any).ZENITH_PREVIEW_MODE) {
                console.log(`[Mockup_Runner] Intercepting request for Agent: ${agentCode}`);
                if (!msgObj) {
                    msgObj = {
                        agentCode, agentName: agent.name, agentColor: agent.color, agentImg: agent.img,
                        content: '', round, isStreaming: true, nodeName: taskMetadata?.nodeName,
                        path: tracePath, reasoning: ''
                    };
                    pipelineContext.messages.push(msgObj);
                }

                // 🎭 AGENT-SPECIFIC MOCK SCRIPT
                const mockContent = MOCK_SCRIPTS[agentCode] || `[Mockup_Response] Agent ${agentCode} is operating in limited preview mode. Current task: ${this.context.activePrompt}`;
                
                // Trigger UI to show initial empty bubble
                msgObj.content = '';
                this.context.messages = [...pipelineContext.messages]; 
                this.context._p.messages = this.context.messages;
                this.context.scheduleRender(DIRTY_CONTENT);

                const words = mockContent.split(' ');
                for (const word of words) {
                    if (this.context.stopRequested) break;
                    msgObj.content += word + ' ';
                    this.context.updateStreamingChunk(agentCode, word + ' ');
                    
                    // 🌳 LIVE_MOCKUP_SYNC: Sync during mockup stream (Silent to avoid flickering)
                    if (msgObj.content.length % 50 === 0) {
                        this.syncGraphFromContent(agentCode, agent.name, msgObj.content, round, true);
                    }
                    await new Promise(r => setTimeout(r, 30)); // Simulated stream speed
                }

                // 🌳 MOCKUP_GRAPH_SYNC: Final sync
                this.syncGraphFromContent(agentCode, agent.name, mockContent, round);
                return;
            }

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

                // 🚀 LIVE_REAL_SYNC: Sync during real stream to populate path analysis
                if (msgObj.content.length % 50 === 0) {
                    this.syncGraphFromContent(agentCode, agent.name, msgObj.content, round, true);
                }
            }

            // 🚀 REAL_GRAPH_SYNC: Inject nodes into global state for Path Analysis after real stream
            this.syncGraphFromContent(agentCode, agent.name, msgObj.content, round);
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

    /**
     * 🌳 GRAPH_SYNC_ENGINE: Universal parser and injector for Pathway Analysis.
     */
    private syncGraphFromContent(agentCode: string, agentName: string, content: string, round: number, silent = false) {
        const win = window as any;
        if (!win.semanticNodes) win.semanticNodes = [];
        if (!win.semanticLinks) win.semanticLinks = [];

        // 1. Ensure ROOT exists
        if (win.semanticNodes.length === 0) {
            win.semanticNodes.push({
                id: 'root-node', title: this.context.activePrompt.slice(0, 30) || 'CORE_MISSION', type: 'ROOT',
                agentCode: 'SYSTEM', x: 400, y: 300, content: this.context.activePrompt
            });
        }

        const rootNode = win.semanticNodes.find((n: any) => n.type === 'ROOT');

        // 2. Create/Update BRANCH for this Agent
        const branchId = `branch-${agentCode}-${round}`;
        let branch = win.semanticNodes.find((n: any) => n.id === branchId);
        
        // CHAPTER LABEL: Use first 20 chars as key point bullet
        const cleanContent = content.replace(/【.*?】/g, '').trim();
        const chapterTitle = cleanContent.slice(0, 18) + (cleanContent.length > 18 ? '...' : '');

        if (!branch) {
            branch = {
                id: branchId, title: chapterTitle || `${agentName} Focus`, type: 'BRANCH',
                agentCode, parentId: rootNode?.id, x: 500,
                y: 300, content: content // Store full content for side panel
            };
            win.semanticNodes.push(branch);
            if (rootNode) win.semanticLinks.push({ source: rootNode.id, target: branchId, value: 1, type: 'HIERARCHICAL' });
        } else {
            // Update title as more content streams in
            branch.title = chapterTitle;
            branch.content = content;
        }

        // 3. Create LEAF nodes from Pathway Blocks (【解說】)
        const chunks = content.split('【解說】');
        let added = false;
        chunks.forEach((chunk, i) => {
            if (i === 0 || chunk.trim().length < 10) return;
            const leafId = `leaf-${agentCode}-${round}-${i}`;
            const existingLeaf = win.semanticNodes.find((n: any) => n.id === leafId);
            
            // LEAF LABEL: Use first 25 chars of the tactical block
            const leafContent = chunk.trim();
            const leafTitle = leafContent.slice(0, 22) + (leafContent.length > 22 ? '...' : '');

            if (!existingLeaf) {
                win.semanticNodes.push({
                    id: leafId, title: leafTitle, type: 'LEAF',
                    agentCode, parentId: branchId, x: 700,
                    y: 300, content: `【解說】${leafContent}`
                });
                win.semanticLinks.push({ source: branchId, target: leafId, value: 1, type: 'HIERARCHICAL' });
                added = true;
            } else {
                existingLeaf.title = leafTitle;
                existingLeaf.content = `【解說】${leafContent}`;
            }
        });
        
        if (added) console.log(`[Graph_Sync] Updated ${win.semanticNodes.length} nodes for ${agentCode}`);
        
        if (!silent) {
            this.context.scheduleRender(DIRTY_CONTENT);
        }
    }
}
