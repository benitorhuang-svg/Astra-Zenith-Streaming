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
 * Optimized for 2026 Frontier Fleet (Frontier 3.1 & Gemma 4)
 */
export class AgentTaskRunner {
    constructor(private context: PortalContext) {}

    public async execute(agentCode: string, round: number, shardingDirective: string, taskMetadata?: PortalExecutionTask): Promise<void> {
        const agent: Agent | undefined = this.context.agentPool.find((a: any) => a.code === agentCode);
        if (!agent) return;
        
        const maxRetries = 3;
        const tracePath = createAgentPath(agentCode, `ROUND_${round}`, taskMetadata?.nodeName ?? undefined);
        
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
            
            // 🚀 DYNAMIC_SKILL_INJECTION: Load specialized expertise based on topic
            let specializedSkill = '';
            if (this.context.activePrompt.toUpperCase().includes('POWER QUERY') || this.context.activePrompt.toUpperCase().includes('PQ')) {
                try {
                    const res = await fetch('./prompt/skill_power_query_architect.md');
                    if (res.ok) specializedSkill = `\n\n[SPECIALIZED_SKILL_ACTIVE]:\n${await res.text()}`;
                } catch (e) { console.warn('SKILL_LOAD_FAIL:', e); }
            }

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

            const apiContextMessages = this.context.messages.slice(-12).filter(m => !m.content.includes('ERROR:'));
            
            const rawContext = [
                ...apiContextMessages.map(m => ({
                    role: m.agentCode === 'USER' ? 'user' : 'model',
                    content: m.content
                })),
                {
                    role: 'user',
                    content: `${currentTimestamp}\n${parentContext}\n[URGENT_TACTICAL_COMMAND]: ${this.context.activePrompt}\n\n[YOUR_SPECIFIC_FOCUS]: ${shardingDirective}${specializedSkill}`
                }
            ];

            // 🚀 ROLE_CONSOLIDATION: Gemini requires strictly alternating user/model roles
            const apiMessages: any[] = [];
            rawContext.forEach(msg => {
                const last = apiMessages[apiMessages.length - 1];
                if (last && last.role === msg.role) {
                    last.content += `\n\n${msg.content}`;
                } else {
                    apiMessages.push({ role: msg.role, content: msg.content });
                }
            });

            // 🚀 FULL_MOCKUP_INTERCEPTION: Only if ZENITH_PREVIEW_MODE is true
            if ((window as any).ZENITH_PREVIEW_MODE) {
                let msgObj = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round);
                if (!msgObj) {
                    msgObj = {
                        agentCode, agentName: agent.name, agentColor: agent.color, agentImg: agent.img,
                        content: '', round, isStreaming: true, nodeName: taskMetadata?.nodeName,
                        path: tracePath, reasoning: ''
                    };
                    this.context.messages.push(msgObj);
                }

                const mockContent = MOCK_SCRIPTS[agentCode] || `[Mockup_Response] Agent ${agentCode} is operating in limited preview mode.`;
                
                msgObj.content = '';
                msgObj.isStreaming = true;
                this.context.scheduleRender(DIRTY_CONTENT);
                await new Promise(r => requestAnimationFrame(r));

                const words = mockContent.split(' ');
                for (const word of words) {
                    if (this.context.stopRequested) break;
                    msgObj.content += word + ' ';
                    this.context.updateStreamingChunk({ code: agentCode, round }, word + ' ');
                    await new Promise(r => setTimeout(r, 30));
                }

                msgObj.isStreaming = false;
                this.syncGraphFromContent(agentCode, agent.name, mockContent, round);
                return;
            }

            // 🚀 REAL_MODE_EXECUTION
            let msgObj = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round);
            if (!msgObj) {
                msgObj = {
                    agentCode, agentName: agent.name, agentColor: agent.color, agentImg: agent.img,
                    content: '', round, isStreaming: true, nodeName: taskMetadata?.nodeName,
                    path: tracePath, reasoning: ''
                };
                this.context.messages.push(msgObj);
            }
            this.context.scheduleRender(DIRTY_CONTENT);
            await new Promise(r => requestAnimationFrame(r));

            // Tier-Aware Model Selection
            let modelId = (this.context as any)._p.agentModels[agentCode];
            if (!modelId || (this.context as any)._p.billingTier === 'FREE') {
                switch(agentCode) {
                    case 'A1': case 'A4': modelId = 'gemma-4-26b-a4b-it'; break;
                    case 'A3': modelId = 'gemini-robotics-er-1.5-preview'; break;
                    default: modelId = 'gemini-3.1-flash-lite-preview';
                }
            }

            try {
                const response = await fetch('/api/generate-stream', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        agentId: agentCode, 
                        model: modelId, 
                        apiKey: this.context.apiKey,
                        messages: apiMessages
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `STATUS_${response.status}`);
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('STREAM_READER_UNAVAILABLE');
                
                const decoder = new TextDecoder();
                while (true) {
                    if (this.context.stopRequested) { await reader.cancel(); break; }
                    const { done, value } = await reader.read();
                    if (done) break;
                    const chunk = decoder.decode(value, { stream: true });
                    msgObj.content += chunk;
                    this.context.updateStreamingChunk({ code: agentCode, round }, chunk);
                }
            } catch (err: any) {
                msgObj.content = `[SYSTEM_ERROR]: ${err.message || 'Unknown API Failure'}\n請檢查 API Key 或切換至 Preview Mode。`;
                msgObj.isStreaming = false;
                this.context.scheduleRender(DIRTY_CONTENT);
            }

            this.syncGraphFromContent(agentCode, agent.name, msgObj.content, round);
        };

        const runPipeline = composeMiddlewares([
            withAuditLog(`MISSION:${agentCode}`, taskMetadata?.nodeName ?? shardingDirective),
            withTokenGuard(12000, 12),
            withTurnTracking(this.context.pollingCycles),
            withRetry({ maxAttempts: maxRetries, baseDelayMs: 1000 })
        ], async () => {
            await performRequest();
        });

        try {
            await runPipeline(pipelineContext);
        } catch (err) {
            console.error(`[AGENT_RUNNER_ERROR] ${agentCode}:`, err);
        } finally {
            const finalMessage = pipelineContext.messages.find(m => m.agentCode === agentCode && m.round === round);
            if (finalMessage) finalMessage.isStreaming = false;
            this.context.scheduleRender(DIRTY_CONTENT);
        }
    }

    private syncGraphFromContent(agentCode: string, agentName: string, content: string, round: number, silent = false) {
        const win = window as any;
        if (!win.semanticNodes) win.semanticNodes = [];
        if (!win.semanticLinks) win.semanticLinks = [];

        // 1. Root Node Auto-Gen
        if (win.semanticNodes.length === 0) {
            win.semanticNodes.push({
                id: 'root-node', title: this.context.activePrompt.slice(0, 30) || 'CORE_MISSION', type: 'ROOT',
                agentCode: 'SYSTEM', x: 400, y: 300, content: this.context.activePrompt
            });
        }

        const rootNode = win.semanticNodes.find((n: any) => n.type === 'ROOT');
        const branchId = `branch-${agentCode}-${round}`;
        let branch = win.semanticNodes.find((n: any) => n.id === branchId);
        
        const cleanContentForTitle = content.replace(/\[STRATEGIC_MAP\].*?(\n\n|$)/gs, '').replace(/##.*?(\n|$)/g, '').trim();
        const chapterTitle = cleanContentForTitle.slice(0, 18) + (cleanContentForTitle.length > 18 ? '...' : '');

        if (!branch) {
            branch = {
                id: branchId, title: chapterTitle || `${agentName} Focus`, type: 'BRANCH',
                agentCode, parentId: rootNode?.id, x: 500,
                y: 300, content: content 
            };
            win.semanticNodes.push(branch);
            if (rootNode) win.semanticLinks.push({ source: rootNode.id, target: branchId, value: 1, type: 'HIERARCHICAL' });
        } else {
            branch.title = chapterTitle;
            branch.content = content;
        }

        // 🚀 AZ-TEP PROTOCOL PARSER: Protocol-First Node Alignment
        const h2Segments = content.split(/^##\s+/gm);
        
        h2Segments.forEach((h2Seg, i) => {
            if (i === 0) return; 
            
            const h2Lines = h2Seg.split('\n');
            const h2Header = h2Lines[0].trim();
            const h2Remainder = h2Lines.slice(1).join('\n').trim();
            
            const h2Parts = h2Header.split('|').map(p => p.trim());
            const h2IdCode = h2Parts[0] || `P${i}`;
            const uiTitle = h2Parts[1] || h2Parts[0]; 
            
            const h2Id = `leaf-h2-${agentCode}-${round}-${h2IdCode}`;

            let nodeH2 = win.semanticNodes.find((n: any) => n.id === h2Id);
            if (!nodeH2) {
                nodeH2 = {
                    id: h2Id, title: uiTitle, type: 'LEAF',
                    agentCode, parentId: branchId, x: 700, y: 300, 
                    content: `## ${h2Header}`
                };
                win.semanticNodes.push(nodeH2);
                win.semanticLinks.push({ source: branchId, target: h2Id, value: 1, type: 'HIERARCHICAL' });
            } else {
                nodeH2.title = uiTitle;
            }

            const h3Segments = h2Remainder.split(/^###\s+/gm);
            nodeH2.content = `## ${h2Header}\n\n${h3Segments[0]}`;

            h3Segments.forEach((h3Seg, j) => {
                if (j === 0) return;

                const h3Lines = h3Seg.split('\n');
                const h3Header = h3Lines[0].trim();
                const h3Body = h3Lines.slice(1).join('\n').trim();
                
                const h3Parts = h3Header.split('|').map(p => p.trim());
                const h3IdCode = h3Parts[0] || `D${j}`;
                const h3UiTitle = h3Parts[1] || h3Parts[0];
                
                const h3Id = `leaf-h3-${agentCode}-${round}-${h2IdCode}-${h3IdCode}`;

                const nodeH3 = win.semanticNodes.find((n: any) => n.id === h3Id);
                if (!nodeH3) {
                    win.semanticNodes.push({
                        id: h3Id, title: h3UiTitle, type: 'DETAIL',
                        agentCode, parentId: h2Id, x: 900, y: 300,
                        content: `### ${h3Header}\n\n${h3Body}`
                    });
                    win.semanticLinks.push({ source: h2Id, target: h3Id, value: 0.5, type: 'HIERARCHICAL' });
                } else {
                    nodeH3.title = h3UiTitle;
                    nodeH3.content = `### ${h3Header}\n\n${h3Body}`;
                }
            });
        });

        // 5. 🚀 CONVERGENCE_LOGIC: Create a summary node per agent
        const summaryId = `summary-${agentCode}-${round}`;
        const existingSummary = win.semanticNodes.find((n: any) => n.id === summaryId);
        
        if (!existingSummary && h2Segments.length > 1) {
            win.semanticNodes.push({
                id: summaryId, title: '戰略收斂 / SUMMARY', type: 'ROOT',
                agentCode, parentId: branchId, x: 600, y: 500,
                content: `此節點代表 ${agentName} 在本輪對話中的核心總結與收斂。`
            });
            
            h2Segments.forEach((h2Seg, idx) => {
                if (idx === 0) return;
                const h2Header = h2Seg.split('\n')[0].trim();
                const h2IdCode = h2Header.split('|')[0].trim() || `P${idx}`;
                const h2Id = `leaf-h2-${agentCode}-${round}-${h2IdCode}`;
                win.semanticLinks.push({ source: h2Id, target: summaryId, value: 0.3, type: 'CONVERGENCE' });
            });
        }

        if (!silent) this.context.scheduleRender(DIRTY_CONTENT);
    }
}
