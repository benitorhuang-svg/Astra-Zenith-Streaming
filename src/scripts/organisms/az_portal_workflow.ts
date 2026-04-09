/**
 * AZ PORTAL WORKFLOW HANDLER — Mission Strategy Processor
 * Handles long-running agent streaming, image synthesis, and tactical state management.
 */

import { PortalContext, DIRTY_ALL, DIRTY_CONTENT, DIRTY_SIDEBAR } from './az_portal';
import type { N8NNode, N8NWorkflow } from '../integrations/n8n/n8n_data_types';
import { composeMiddlewares, withAuditLog, withRetry, withTokenGuard, withTurnTracking } from '../core/middleware';
import { createAgentPath, buildAgentEvent } from '../core/agents';
import { estimateApproximateTokens } from '../core/utils';
import type { MissionMessage, PipelineContext } from '../core/types';
import type { Agent } from '../core/agents';
import type { PortalArchive, PortalExecutionTask, PortalWorkflowController } from './az_portal_types';

export class AZPortalWorkflowHandler implements PortalWorkflowController {
    public n8nFlow: N8NWorkflow | null = null;

    constructor(private context: PortalContext) {
        // Initialize with default flow from public if available
        this.loadDefaultFlow();
    }

    private async loadDefaultFlow() {
        try {
            const res = await fetch('./n8n_astra_zenith_flow.json');
            if (res.ok) {
                this.n8nFlow = await res.json();
            } else {
                this.n8nFlow = this.createInitialFlow();
            }
        } catch {
            this.n8nFlow = this.createInitialFlow();
        }
        this.context.n8nFlow = this.n8nFlow!;
    }

    /**
     * Generates the baseline "One Empty Card" state for custom mode.
     */
    private createInitialFlow(): N8NWorkflow {
        return {
            nodes: [
                {
                    id: 'node-root',
                    name: 'INITIAL_TASK',
                    type: 'n8n-nodes-base.agent',
                    typeVersion: 1,
                    position: [400, 300], // Centered start
                    parameters: { focus: '請在此輸入任務目標...' }
                }
            ],
            connections: {}
        };
    }

    public handleAddNode(): void {
        if (!this.n8nFlow || this.n8nFlow.nodes.length === 0) {
            this.n8nFlow = this.createInitialFlow();
            this.context.n8nFlow = this.n8nFlow;
            this.context.pushInternalLog('➕ 已建立初始工作流節點。', 'SUCCESS');
            this.context.scheduleRender(DIRTY_ALL);
            return;
        }

        const lastNode = this.n8nFlow.nodes[this.n8nFlow.nodes.length - 1];
        this.addSuccessorNode(lastNode.name);
    }

    /**
     * Imports an external n8n workflow JSON.
     */
    public async importFlow(json: string): Promise<void> {
        try {
            const flow = JSON.parse(json);
            if (!flow.nodes || !flow.connections) throw new Error('INVALID_N8N_FORMAT');
            
            this.n8nFlow = flow;
            this.context.n8nFlow = flow;
            this.context.pushInternalLog('📥 成功載入外部工作流，節點矩陣已重構。', 'SUCCESS');
            this.context.scheduleRender(DIRTY_ALL);
        } catch (e) {
            this.context.pushInternalLog(`❌ 匯入失敗: ${e}`, 'ERROR');
        }
    }

    /**
     * Dynamically adds a successor node to the workflow.
     */
    public addSuccessorNode(fromNodeName: string): void {
        if (!this.n8nFlow) return;

        const fromNode = this.n8nFlow.nodes.find(n => n.name === fromNodeName);
        if (!fromNode) return;

        const newNodeId = `node-${Math.random().toString(36).substr(2, 5)}`;
        const newNodeName = `Agent_${this.n8nFlow.nodes.length + 1}`;

        const newNode: N8NNode = {
            id: newNodeId,
            name: newNodeName,
            type: 'n8n-nodes-base.agent',
            typeVersion: 1,
            position: [fromNode.position[0] + 250, fromNode.position[1]] as [number, number],
            parameters: { focus: 'New Task' }
        };

        this.n8nFlow.nodes.push(newNode);
        
        // Establish connection
        if (!this.n8nFlow.connections[fromNodeName]) {
            this.n8nFlow.connections[fromNodeName] = { main: [[]] };
        }
        this.n8nFlow.connections[fromNodeName].main[0].push({
            node: newNodeName,
            type: 'main',
            index: 0
        });

        this.context.n8nFlow = this.n8nFlow;
        this.context.pushInternalLog(`➕ 建立節點連線: [${fromNodeName}] -> [${newNodeName}]`, 'SUCCESS');
        this.context.scheduleRender(DIRTY_ALL);
    }

    /**
     * Executes a full mission flow based on detected topology.
     */
    public async handleRunFlow(): Promise<void> {
        if (this.context.isStreaming) return;
        
        // AUTO_SWITCH: Clear archive selection when running a new flow
        if (this.context._p) {
            this.context._p.selectedArchiveId = null;
        }

        // PRE-FLIGHT RE-AUTH: Ensure backend RAM is hot before agents start
        if (this.context.apiKey && this.context.accessMode === 'API_ACCESS') {
            await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: this.context.apiKey })
            }).catch(e => console.warn('Auth warmup bypassed:', e));
        }

        const missionId = `AZ-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const startTime = new Date().toLocaleTimeString();
        
        this.context.isStreaming = true;
        this.context._p.isStreaming = true; // SYNC_BRIDGE
        this.context.currentPasses = 0;
        this.context._p.currentPasses = 0; // SYNC_BRIDGE
        this.context.messages = []; // Clear previous on new run
        this.context._p.messages = this.context.messages; // SYNC_BRIDGE: Keep render reference aligned
        
        // --- INDUSTRIAL_ARCHIVE_INIT ---
        const activeArchive: PortalArchive = {
            id: missionId,
            time: startTime,
            mission: 'LIVE_TACTICAL_DATA',
            title: this.context.activePrompt.slice(0, 45) || 'NEW_TACTICAL_MISSION',
            status: 'INITIALIZING',
            size: '0KB',
            messages: this.context.messages 
        };
        this.context.archives.unshift(activeArchive);
        this.context._p.selectedArchiveId = missionId; 
        
        this.context.scheduleRender(DIRTY_ALL);

        this.context.stopRequested = false; 
        this.context.pushInternalLog(`🚀 [${missionId}] 啟動歸檔鏈路...`, 'SYNC');

        try {
            this.context.executionQueue = [];
            
            if (this.context.currentTopology === 'custom' && this.n8nFlow) {
                this.context.pushInternalLog('⛓️ 進入自訂拓樸模式：依據節點鏈路執行任務。', 'SYNC');
                
                // Simplified BFS traversal for the queue
                const nodes = this.n8nFlow.nodes;
                const connections = this.n8nFlow.connections;
                let currentNodes = nodes.filter(n => n.name === 'Start' || !Object.values(connections).some(c => c.main.some(b => b.some(t => t.node === n.name))));
                
                const visited = new Set<string>();
                while (currentNodes.length > 0) {
                    const nextNodes: N8NNode[] = [];
                    for (const node of currentNodes) {
                        if (visited.has(node.name)) continue;
                        visited.add(node.name);

                        const agentMatch: Agent | undefined =
                            this.context.agentPool.find(a => node.name.includes(a.code)) ||
                            this.context.agentPool.find(a => node.type.includes(a.code));
                        
                        if (agentMatch) {
                            this.context.executionQueue.push({ 
                                agentCode: agentMatch.code, 
                                round: 1, 
                                focus: `NODE_TASK: [${node.name}] - ${node.type}`,
                                nodeName: node.name
                            });
                        }

                        const nodeConns = connections[node.name];
                        if (nodeConns) {
                            nodeConns.main.forEach(batch => batch.forEach(target => {
                                const tNode = nodes.find(n => n.name === target.node);
                                if (tNode) nextNodes.push(tNode);
                            }));
                        }
                    }
                    currentNodes = nextNodes;
                }
            } else {
                // CLASSIC_LINEAR_LOOP
                for (let round = 1; round <= this.context.pollingCycles; round++) {
                    const participants = this.context.tableParticipants.filter((p): p is string => p !== null);
                    participants.forEach((agentCode, _idx) => {
                        const isLastRound = round === this.context.pollingCycles;
                        let focus = 'TACTICAL_ANALYSIS';
                        if (agentCode === 'A1') focus = 'COMMANDER_FOCUS';
                        else if (agentCode === 'A6' && isLastRound) focus = 'SYNTHESIS';
                        this.context.executionQueue.push({ agentCode, round, focus });
                    });
                }
            }

            this.context.scheduleRender(DIRTY_ALL);

            while (this.context.executionQueue.length > 0) {
                if (this.context.stopRequested) break;
                
                const task = this.context.executionQueue[0];
                this.context.scheduleRender(DIRTY_SIDEBAR);
                activeArchive.status = `ACTIVE: ${task.agentCode}`;
                
                // 🔒 SERIAL_LOCK: Wait for current agent to finish completely before next
                await this.executeAgentTask(task.agentCode, task.round, task.focus, task);
                
                this.context.executionQueue.shift();
                this.context.currentPasses = task.round;
                this.context._p.currentPasses = task.round; // SYNC_BRIDGE
                this.context.scheduleRender(DIRTY_ALL);
                
                // ⏳ STAGGER_DELAY: Allow UI to breathe and ensure previous stream is closed
                if (this.context.executionQueue.length > 0) {
                    await new Promise(r => setTimeout(r, 1200));
                }
            }

            this.context.pushInternalLog('✅ 任務歸檔完成。', 'SUCCESS');
            activeArchive.status = 'ARCHIVED';
        } catch (error) {
            this.context.pushInternalLog(`❌ 任務失敗: ${error}`, 'ERROR');
            activeArchive.status = 'MISSION_FAILED';
        } finally {
            this.context.isStreaming = false;
            this.context._p.isStreaming = false; // SYNC_BRIDGE
            this.context.scheduleRender(DIRTY_ALL);
        }
    }

    private _selectedArchiveId: string = '';

    private async executeAgentTask(agentCode: string, round: number, shardingDirective: string, taskMetadata?: PortalExecutionTask): Promise<void> {
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

            const decompositionProtocol = this.context.currentView === 'decision-tree'
                ? `\n[MANDATORY_FORMAT]: For each logical unit, you MUST use the following markers:
【解說】(Detailed explanation of the reasoning)
【Q】(The core question or pivot point)
【A】(The tactical answer or implementation)
【Summary】(A one-sentence executive summary)
You may repeat this block multiple times ( {解說 -> Q -> A -> Summary} * N ) for complex topics.`
                : '';

            let parentContext = '';
            if (this.context.currentTopology === 'custom' && this.n8nFlow && taskMetadata?.nodeName) {
                const parents = Object.entries(this.n8nFlow.connections)
                    .filter(([, conn]) => conn.main.some(batch => batch.some(target => target.node === taskMetadata.nodeName)))
                    .map(([source]) => source);

                const parentMessages = pipelineContext.messages.filter(message => message.nodeName && parents.includes(message.nodeName));
                if (parentMessages.length > 0) {
                    parentContext = `\n[PARENT_NODE_DATA]:\n${parentMessages.map(message => `--- FROM [${message.nodeName}] ---\n${message.content}`).join('\n')}`;
                }
            }

            const apiMessages = [
                {
                    role: 'user',
                    content: `${currentTimestamp}\n${systemInstruction}${decompositionProtocol}${parentContext}\n[URGENT_TACTICAL_COMMAND]: ${this.context.activePrompt}\n[YOUR_SPECIFIC_FOCUS]: ${shardingDirective}\n[REDUNDANCY_CHECK]: ${agentCode === 'A6' ? 'DO NOT FILTER. Synthesize previous agent outputs.' : 'Focus on your specific perspective.'}`
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
                body: JSON.stringify({
                    agentId: agentCode,
                    messages: apiMessages,
                    stream: true,
                    useCompactMode: true
                })
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.context.pushInternalLog(`❌ 認證失敗 (STATUS_${response.status})：通訊鏈路已切斷。`, 'ERROR');
                    this.context.setWelcomeError('API 認證失敗：您的工業金鑰無效或工作站授權已過期。請重新驗證身分。');
                    this.context._p.handleModeSwitch('welcome');
                    throw new Error(`AUTH_FAILED_${response.status}`);
                }

                if (response.status === 503 || response.status === 429) {
                    throw new Error(`RETRYABLE_STATUS_${response.status}`);
                }

                throw new Error(`STATUS_${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
                throw new Error('STREAM_READER_UNAVAILABLE');
            }

            if (!msgObj) {
                msgObj = {
                    agentCode,
                    agentName: agent.name,
                    agentColor: agent.color,
                    agentImg: agent.img,
                    content: '',
                    round,
                    isStreaming: true,
                    nodeName: taskMetadata?.nodeName,
                    path: tracePath,
                    reasoning: '',
                    summary: agentCode === 'A6' ? 'Synthesis agent active' : undefined
                };
                pipelineContext.messages.push(msgObj);
            }

            msgObj.content = '';
            this.context.scheduleRender(DIRTY_CONTENT);
            pipelineContext.events.push(buildAgentEvent('status', { state: 'streaming' }, tracePath, { agentCode, round }));

            const decoder = new TextDecoder();
            while (true) {
                if (this.context.stopRequested) {
                    await reader.cancel();
                    break;
                }

                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                msgObj.content += chunk;
                this.context.updateStreamingChunk(agentCode, chunk);
            }
        };

        const runPipeline = composeMiddlewares(
            [
                withAuditLog({ label: `MISSION:${agentCode}`, detail: taskMetadata?.nodeName ?? shardingDirective }),
                withTokenGuard({ maxTokens: 12000, keepLatestMessages: 12, summaryLabel: 'Predictive compaction' }),
                withTurnTracking({ maxTurns: this.context.pollingCycles }),
                withRetry({
                    maxAttempts: maxRetries,
                    baseDelayMs: 1000,
                    shouldRetry: (error) => error instanceof Error && /RETRYABLE_STATUS|network|timeout|abort/i.test(error.message),
                    onRetry: (error, attempt, delayMs) => {
                        this.context.pushInternalLog(`⏳ ${agentCode} 重試 ${attempt}/${maxRetries}，等待 ${delayMs}ms。`, 'WARNING');
                        this.context.pushInternalLog(`↳ ${error instanceof Error ? error.message : String(error)}`, 'WARNING');
                    }
                })
            ],
            async () => {
                this.context.messages = pipelineContext.messages;
                this.context._p.messages = this.context.messages; // SYNC_BRIDGE
                await performRequest();
            }
        );

        try {
            await runPipeline(pipelineContext);
        } catch (err) {
            console.error(`[WORKFLOW_ERROR] ${agentCode}:`, err);
            const fallbackMessage = `[OFFLINE]: 多次重試失敗。伺服器目前負載過高。`;
            let msgObj: MissionMessage | undefined = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round);

            if (!msgObj) {
                msgObj = {
                    agentCode,
                    agentName: agent.name,
                    agentColor: agent.color,
                    agentImg: agent.img,
                    content: fallbackMessage,
                    round,
                    isStreaming: false,
                    path: tracePath,
                    summary: 'Fallback response generated'
                };
                pipelineContext.messages.push(msgObj);
            } else {
                msgObj.content = fallbackMessage;
                msgObj.isStreaming = false;
            }

            this.context.pushInternalLog(`❌ ${agentCode} 失聯 (503 重試耗盡)`, 'ERROR');
        } finally {
            const finalMessage = pipelineContext.messages.find(message => message.agentCode === agentCode && message.round === round);
            if (finalMessage) {
                finalMessage.isStreaming = false;
            }
            pipelineContext.events.push(buildAgentEvent('status', { state: 'complete' }, tracePath, { agentCode, round }));
            this.context.messages = pipelineContext.messages;
            this.context._p.messages = this.context.messages; // SYNC_BRIDGE
            this.context.scheduleRender(DIRTY_CONTENT);
        }
    }

    /**
     * Synthesizes a high-fidelity tactical infographic via Imagen 4.0 Ultra.
     */
    public async handleVisualize(prompt: string): Promise<void> {
        const generationId = `IMG-${Date.now().toString(36).toUpperCase()}`;
        this.context.isStreaming = true;
        
            const placeholder: PortalArchive = {
                id: generationId,
                time: new Date().toLocaleTimeString(),
                mission: 'SYNTHESIS_HUB',
            title: `🎨 SYNTHESIZING...`,
            status: 'GENERATING',
            isGenerating: true,
            isImage: true,
            imageUrl: null 
        };
        this.context.archives.unshift(placeholder);
        this.context._p.selectedArchiveId = generationId;
        this.context.scheduleRender(DIRTY_ALL);
        
        this.context.pushInternalLog(`🎨 正在喚醒 Imagen 4.0 Ultra 針對 ${generationId} ...`, 'SYNC');
        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) throw new Error(`HTTP_STATUS_${response.status}`);

            const data = await response.json();
            if (data.status === 'SUCCESS') {
                const imgData = `data:image/png;base64,${data.image}`;
                placeholder.status = 'SUCCESS';
                placeholder.isGenerating = false;
                placeholder.imageUrl = imgData;
                placeholder.title = `IMAGE: Archive Infographic`;

                this.context.messages.push({
                    agentCode: 'IMG',
                    agentName: 'IMAGEN 4.0',
                    agentColor: '#FFD700',
                    agentImg: 'agent_a6.png',
                    content: `![GENERATED_IMAGE](${imgData})`,
                    round: this.context.currentPasses,
                    isImage: true,
                    imageUrl: imgData,
                    isStreaming: false,
                    path: createAgentPath('IMG', 'ARCHIVE', generationId),
                    summary: 'Imagen synthesis complete'
                });

                this.context.pushInternalLog('✅ 圖像生成成功。', 'SUCCESS');
            } else {
                throw new Error(data.error || 'IMAGE_GEN_FAILED');
            }
        } catch (error) {
            this.context.pushInternalLog(`❌ 繪圖失敗: ${error}`, 'ERROR');
            placeholder.status = 'FAILED';
            placeholder.isGenerating = false;
            placeholder.title = `❌ GENERATION_FAILED`;
            placeholder.error = `${error}`;
        } finally {
            this.context.isStreaming = false;
            this.context.scheduleRender(DIRTY_ALL);
        }
    }
}
