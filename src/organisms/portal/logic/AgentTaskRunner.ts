import { 
    PortalContext, DIRTY_CONTENT, PortalExecutionTask 
} from '../PortalTypes';
import { createAgentPath, buildAgentEvent } from '../../../core/agents';
import { estimateApproximateTokens } from '../../../core/utils';
import type { PipelineContext } from '../../../core/types';
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
            const now = new Date();
            const currentTimestamp = `[LOCAL_TIME]: ${now.toLocaleDateString()} ${now.toLocaleTimeString()} UTC+8`;
            const parentContext = ''; 
            let specializedSkill = '';
            
            if (this.context.activePrompt.toUpperCase().match(/POWER QUERY|PQ|M語法/)) {
                try {
                    const res = await fetch('./prompt/skill_power_query_architect.md');
                    if (res.ok) specializedSkill = `\n\n[GOVERNING_SKILL_ACTIVE]:\n${await res.text()}`;
                } catch (err) { console.warn('Skill Load Fail', err); }
            }

            const sharedVars: Record<string, string> = {};
            const factAnchors: string[] = [];
            const inquiries: string[] = [];
            this.context.messages.forEach(m => {
                const vMatches = m.content.matchAll(/\[VARIABLE\]:\s*(\w+)\s*=\s*(.*)/g);
                for (const match of vMatches) sharedVars[match[1]] = match[2].trim();
                const fMatches = m.content.matchAll(/\[FACT\]:\s*(.*)/g);
                for (const match of fMatches) factAnchors.push(match[1].trim());
                const inquiriesMatch = m.content.matchAll(/\[INQUIRY\]:\s*(\w+)/g);
                for (const match of inquiriesMatch) inquiries.push(match[1].trim());
            });

            const varBlock = Object.keys(sharedVars).length > 0 ? `\n[SHARED_CONSTANTS]:\n${Object.entries(sharedVars).map(([k,v]) => `- ${k}: ${v}`).join('\n')}` : '';
            const factBlock = factAnchors.length > 0 ? `\n[FACT_ANCHORS]:\n${factAnchors.map((f, i) => `- F${i+1}: ${f}`).join('\n')}` : '';

            const apiContextMessagesRaw = this.context.messages.filter(m => m.round === round || (m.agentCode === 'USER') || (m.agentCode === 'A1' && round > 1));

            const apiContextMessages = apiContextMessagesRaw.map(m => {
                let content = m.content;
                const domain = m.agentCode === 'A1' ? 'STRATEGIC_SCAFFOLD' : (m.agentCode === 'USER' ? 'USER_COMMAND' : 'SPECIALIZED_OUTPUT');
                const isTargetOfInquiry = inquiries.some(id => m.content.includes(`## ${id}`) || m.agentCode === id);

                if (m.agentCode === 'A1' && agentCode !== 'A1' && content.includes('[STRATEGIC_MAP]')) {
                    const mapOnly = content.match(/\[STRATEGIC_MAP\][\s\S]*?(?=\n\n|##|$)/);
                    content = mapOnly ? `${mapOnly[0]}\n\n[INFO]: 全域協議基準。` : content;
                } else if (agentCode !== m.agentCode && domain === 'SPECIALIZED_OUTPUT' && !isTargetOfInquiry) {
                    const summary = content.match(/\[SUMMARY\][\s\S]*$/);
                    content = summary ? `[CORE_SUMMARY]: ${summary[0]}` : `[TRUNCATED]`;
                } else if (isTargetOfInquiry) {
                    content = `[PRIORITY_FULL_DATA]:\n${content}\n(回溯數據)`;
                }
                return { ...m, content: `[INPUT_DATA: ${domain}]:\n${content}` };
            });

            const lastMapMsg = [...apiContextMessages].reverse().find(m => m.content.includes('[STRATEGIC_MAP]'));
            let alignmentLock = '';
            if (lastMapMsg) {
                const mapMatch = lastMapMsg.content.match(/\[STRATEGIC_MAP\][\s\S]*?(?=\n\n|##|$)/);
                if (mapMatch) alignmentLock = `\n\n[CRITICAL_LOCK]: 嚴禁偏離大綱。引用請標註 [REF: FX]。`;
            }

            const workOrder = `[MISSION_WORK_ORDER]:
- 目標: ${shardingDirective}
- 職責: 僅填充 A1 架構。
[PROTOCOLS]: 引用 [REF: FX]，疑問 [INQUIRY]: IDCode，進度 [PROGRESS]: X%。${varBlock}${factBlock}`;

            const rawContext = [
                ...apiContextMessages.map(m => ({ 
                    role: m.agentCode === 'USER' ? 'user' : 'model', // Standardize role
                    content: m.content 
                })),
                { role: 'user', content: `${currentTimestamp}\n${parentContext}\n${workOrder}${alignmentLock}\n[COMMAND]: ${this.context.activePrompt}\n\n[TECH_CONTEXT]: ${specializedSkill}` }
            ];

            const apiMessages: any[] = [];
            rawContext.forEach(msg => {
                const last = apiMessages[apiMessages.length - 1];
                if (last && last.role === msg.role) { last.content += `\n\n${msg.content}`; }
                else { apiMessages.push({ role: msg.role, content: msg.content }); }
            });

            let msgObj = pipelineContext.messages.find(m => m.agentCode === agentCode && m.round === round);
            if (!msgObj) {
                msgObj = { agentCode, agentName: agent.name, agentColor: agent.color, agentImg: agent.img, content: '', round, isStreaming: true, nodeName: taskMetadata?.nodeName, path: tracePath, reasoning: '' };
                this.context.messages.push(msgObj);
            }
            msgObj.isStreaming = true;
            this.context.scheduleRender(DIRTY_CONTENT);

            const runStreamRequest = async (attempt: number = 0): Promise<void> => {
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
                        this.context.scheduleRender(DIRTY_CONTENT);
                        if (tokenCount % 15 === 0 || chunk.includes('\n')) this.syncGraphFromContent(agentCode, agent.name, msgObj!.content, round, true);
                    }
                } catch (err: any) {
                    if (attempt < 1) return await runStreamRequest(attempt + 1);
                    msgObj!.content = `[SYSTEM_ERROR]: ${err.message}`;
                }
            };
            await runStreamRequest();
            msgObj.isStreaming = false;
            this.syncGraphFromContent(agentCode, agent.name, msgObj.content, round);
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

    private syncGraphFromContent(agentCode: string, agentName: string, content: string, round: number, silent = false) {
        const win = window as any;
        if (!win.semanticNodes) win.semanticNodes = [];
        if (!win.semanticLinks) win.semanticLinks = [];

        if (win.semanticNodes.length === 0) {
            win.semanticNodes.push({ id: 'root-node', title: this.context.activePrompt.slice(0, 30) || 'CORE_MISSION', type: 'ROOT', agentCode: 'SYSTEM', x: 400, y: 300, content: this.context.activePrompt });
        }

        const rootNode = win.semanticNodes.find((n: any) => n.type === 'ROOT');
        const branchId = `branch-${agentCode}-${round}`;
        let branch = win.semanticNodes.find((n: any) => n.id === branchId);
        const cleanContentForTitle = content.replace(/\[STRATEGIC_MAP\].*?(\n\n|$)/gs, '').replace(/##.*?(\n|$)/g, '').trim();
        const chapterTitle = cleanContentForTitle.slice(0, 18) + (cleanContentForTitle.length > 18 ? '...' : '');

        if (!branch) {
            let parentNodeId = rootNode?.id;
            if (this.context.currentTopology === 'linear') {
                const prevBranches = win.semanticNodes.filter((n: any) => n.type === 'BRANCH' && n.id !== branchId);
                if (prevBranches.length > 0) parentNodeId = prevBranches[prevBranches.length - 1].id;
            }
            branch = { id: branchId, title: chapterTitle || `${agentName} Focus`, type: 'BRANCH', agentCode, parentId: parentNodeId, x: 500, y: 300, content: content };
            win.semanticNodes.push(branch);
            if (parentNodeId) win.semanticLinks.push({ source: parentNodeId, target: branchId, value: 1, type: 'HIERARCHICAL' });
        } else { branch.title = chapterTitle; branch.content = content; }

        const mapMatch = content.match(/\[STRATEGIC_MAP\]\n([\s\S]*?)(?=\n\n|##|$)/);
        if (mapMatch) {
            const mapLines = mapMatch[1].split('\n').filter(l => l.includes('|'));
            const missionPoints: any[] = [];
            mapLines.forEach(line => {
                const parts = line.split('|').map(s => s.trim());
                if (parts.length < 2) return;
                const rawId = parts[0].replace('-', '').trim();
                const uiTitle = parts[1];
                const fullTitle = parts[2] || uiTitle;
                if (rawId.startsWith('P')) missionPoints.push({ idCode: rawId, uiTitle, fullTitle });
                const targetId = rawId.startsWith('P') ? `global-p-${rawId}` : `leaf-h3-${agentCode}-${round}-${rawId}`;
                let ghost = win.semanticNodes.find((n: any) => n.id === targetId);
                if (!ghost) {
                    ghost = { id: targetId, title: uiTitle, type: rawId.startsWith('P') ? 'LEAF' : 'DETAIL', agentCode, parentId: branch!.id, x: rawId.startsWith('P') ? 700 : 900, y: 300, content: `[GHOST]: ${fullTitle} ...`, isGhost: true };
                    win.semanticNodes.push(ghost);
                    win.semanticLinks.push({ source: branch!.id, target: targetId, value: 1, type: 'HIERARCHICAL' });
                }
            });
            if (agentCode === 'A1') (this.context as any).missionPoints = missionPoints;
        }

        const h2Segments = content.split(/^##\s+/gm);
        h2Segments.forEach((h2Seg, i) => {
            if (i === 0) return; 
            const h2Lines = h2Seg.split('\n');
            const h2Header = h2Lines[0].trim();
            const h2Parts = h2Header.split('|').map(p => p.trim());
            const h2IdCode = h2Parts[0] || `P${i}`;
            const h2Id = `global-p-${h2IdCode}`;
            let nodeH2 = win.semanticNodes.find((n: any) => n.id === h2Id);
            if (!nodeH2) {
                nodeH2 = { id: h2Id, title: h2Parts[1] || h2Parts[0], type: 'LEAF', agentCode, parentId: branchId, x: 700, y: 300, content: `## ${h2Header}` };
                win.semanticNodes.push(nodeH2);
                win.semanticLinks.push({ source: branchId, target: h2Id, value: 1, type: 'HIERARCHICAL' });
            } else { 
                nodeH2.title = h2Parts[1] || h2Parts[0]; 
                nodeH2.isGhost = false; 
                nodeH2.agentCode = agentCode; 
                if (content.includes('[CONFLICT_ALERT]')) nodeH2.title = `⚠️ ${nodeH2.title}`;
                const progressMatch = content.match(/\[PROGRESS\]:\s*(\d+)%/);
                if (progressMatch) nodeH2.title = `${nodeH2.title} (${progressMatch[1]}%)`;
            }
            
            const h3Segments = h2Seg.split('\n').slice(1).join('\n').split(/^###\s+/gm);
            nodeH2.content = `## ${h2Header}\n\n${h3Segments[0]}`;
            h3Segments.forEach((h3Seg, j) => {
                if (j === 0) return;
                const h3Lines = h3Seg.split('\n');
                const h3Header = h3Lines[0].trim();
                const h3Parts = h3Header.split('|').map(p => p.trim());
                const h3Id = `leaf-h3-${agentCode}-${round}-${h3Parts[0] || `D${j}`}`;
                let nodeH3 = win.semanticNodes.find((n: any) => n.id === h3Id);
                if (!nodeH3) {
                    nodeH3 = { id: h3Id, title: h3Parts[1] || h3Parts[0], type: 'DETAIL', agentCode, parentId: h2Id, x: 900, y: 300, content: `### ${h3Header}\n\n${h3Lines.slice(1).join('\n')}` };
                    win.semanticNodes.push(nodeH3);
                    win.semanticLinks.push({ source: h2Id, target: h3Id, value: 0.5, type: 'HIERARCHICAL' });
                } else { nodeH3.content = `### ${h3Header}\n\n${h3Lines.slice(1).join('\n')}`; nodeH3.isGhost = false; }
            });
        });

        const summaryId = `summary-${agentCode}-${round}`;
        if (!win.semanticNodes.find((n: any) => n.id === summaryId) && h2Segments.length > 1) {
            win.semanticNodes.push({ id: summaryId, title: '戰略收斂 / SUMMARY', type: 'ROOT', agentCode, parentId: branchId, x: 600, y: 500, content: `此節點代表 ${agentName} 的核心收斂。` });
            h2Segments.forEach((h2Seg, idx) => {
                if (idx === 0) return;
                const h2Id = `global-p-${h2Seg.split('\n')[0].split('|')[0].trim() || `P${idx}`}`;
                win.semanticLinks.push({ source: h2Id, target: summaryId, value: 0.3, type: 'CONVERGENCE' });
            });
        }
        if (!silent) this.context.scheduleRender(DIRTY_CONTENT);
    }
}
