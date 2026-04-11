import { Response } from 'express';
import { pool, type StreamMessage } from '../models/Agent';
import { pushLog } from './LogService';
import { contextCacheService } from './ContextCacheService';
import { telemetryService } from './TelemetryService';
import { vectorService } from './VectorService';
import { vaultService } from './ObsidianVaultService';
import { 
    saveConversationToCore, 
    extractFactsToMemory, 
    getLocalKnowledgeContext 
} from './CoreService';
import { GEMINI_API_KEY, isPaidTier } from '../core/config';

export class MissionOrchestrator {
    
    async executeDiscussionStream(
        topic: string, 
        agentIds: string[], 
        numRounds: number, 
        res: Response, 
        apiKey?: string
    ) {
        pushLog(`🌀 [MissionOrchestrator] 啟動戰略任務程序：${topic}`, 'info');

        // 🛡️ HARNESS_PRE_FLIGHT_ROUTING (A1 - Router)
        const routingResult = await pool.routeIntent(topic);
        if (!routingResult.allowed) {
            pushLog(`🚫 [Harness_Intercept] 請求已攔截：${routingResult.reason}`, 'error');
            res.write(`data: ${JSON.stringify({ error: `Harness_Intercept: ${routingResult.reason}` })}\n\n`);
            return res.end();
        }

        try {
            const localKnowledge = getLocalKnowledgeContext();
            const missionSpec = `[SDD_MODIFIER: ${routingResult.sddModifier}]\n主題：${topic}\n${localKnowledge}`;
            const missionId = `mission-${Date.now()}`;

            // 🌳 Create Mission ROOT node
            const rootNodeId = `root-${missionId}`;
            await vectorService.addNode(rootNodeId, topic, 'SYSTEM', undefined, 'ROOT', topic);

            // Phase 5: Optimization — Cache the Base Mission Spec once for the entire session if in Paid Tier
            let baseCacheName: string | undefined = undefined;
            if (isPaidTier && GEMINI_API_KEY) {
                baseCacheName = await this.handleContextCaching(missionSpec, agentIds[0], `${missionId}-base`);
            }

            // Structured conversation history
            const history: StreamMessage[] = [
                { role: 'user', content: `【任務背景與核心規格】\n${missionSpec}` }
            ];

            for (let r = 0; r < numRounds; r++) {
                if (numRounds > 1) {
                    pushLog(`🔄 執行第 ${r + 1} 輪探討 (SDD_CYCLE)...`, 'info');
                    res.write(`data: ${JSON.stringify({ round: r + 1, totalRounds: numRounds })}\n\n`);
                }

                for (const agentId of agentIds) {
                    const agent = pool.getAgent(agentId);
                    if (!agent) continue;

                    pushLog(`🧠 [${agentId}] ${agent.name} 正在運算回應...`, 'info');
                    res.write(`data: ${JSON.stringify({ agent: agentId, status: 'START', round: r + 1 })}\n\n`);

                    const graphContext = await vectorService.getGraphContext(topic, 5);
                    const messages: StreamMessage[] = [
                        ...history,
                        { role: 'user', content: `【當前圖譜關聯】\n${graphContext}\n\n請根據上述討論與圖譜內容，進行深度分析或下一步回應。` }
                    ];

                    let fullReply = "";
                    const result = await pool.sendMessage(agentId, messages, (chunk) => {
                        const cleanChunk = chunk.replace(/\*\*/g, '').replace(/--/g, '');
                        fullReply += cleanChunk;
                        res.write(`data: ${JSON.stringify({ agent: agentId, chunk: cleanChunk, round: r + 1 })}\n\n`);
                    }, apiKey, baseCacheName);

                    // 🌿 Create Agent BRANCH node
                    const branchId = `branch-${Date.now()}-${agentId}`;
                    await vectorService.addNode(branchId, fullReply.slice(0, 500), agentId, rootNodeId, 'BRANCH', `${agent.name} 階段性分析`);

                    // 🍃 Semantic Chunker: Split massive output into LEAF nodes linked to BRANCH
                    if (fullReply.length > 30) {
                        const chunks = fullReply.split(/【解說】/);
                        for (let i = 0; i < chunks.length; i++) {
                            const chunkContent = chunks[i].trim();
                            if (chunkContent.length < 20) continue;
                            
                            const nodeContent = i === 0 && !fullReply.startsWith('【解說】') 
                                ? chunkContent 
                                : `【解說】${chunkContent}`;
                                
                            const nodeId = `leaf-${Date.now()}-${agentId}-${i}`;
                            
                            // Extract title if possible (from Summary)
                            const summaryMatch = nodeContent.match(/【Summary】[:：]\s*(.*)/);
                            const chunkTitle = summaryMatch ? summaryMatch[1].slice(0, 40) : undefined;

                            await vectorService.addNode(nodeId, nodeContent, agentId, branchId, 'LEAF', chunkTitle);
                        }
                        pushLog(`🧩 [路徑分析] 已在分支 ${agentId} 下建立 ${chunks.length - 1} 個子節點`, 'success');
                    }

                    res.write(`data: ${JSON.stringify({ agent: agentId, status: 'END', round: r + 1 })}\n\n`);
                    
                    // Guardrail Loop
                    fullReply = await this.executeGuardrailLoop(agentId, agent.name, messages, fullReply, res, apiKey, baseCacheName, r + 1);

                    extractFactsToMemory(fullReply);

                    // Telemetry
                    if (result && result.usage) {
                        this.recordTelemetry(result.usage, res);
                    }
                    
                    // Add to structured history
                    history.push({ role: 'model', content: fullReply });
                    
                    // Optimization: Context Pruning (Keep initial spec + last 8 turns)
                    if (history.length > 10) {
                        const spec = history[0];
                        const recent = history.slice(-8);
                        history.length = 0;
                        history.push(spec, ...recent);
                        pushLog(`✂️ [Context] 執行對話剪裁 (保留核心規格 + 最近 8 回合)`, 'warn');
                    }
                    
                    // Critical: Increase delay for Matrix Mode to prevent 429 after heavy output
                    await this.applyDynamicDelay(agent.modelName, fullReply.length);
                }
            }

            // Post-flight Guardrail
            pushLog(`🛡️ [Harness] 正在執行輸出安全掃描...`, 'warn');
            const finalContext = history.map(m => `[${m.role === 'model' ? 'AGENT' : 'SYSTEM'}]: ${m.content}`).join('\n\n');
            const secureContext = await pool.validateOutput(finalContext);

            saveConversationToCore(topic, secureContext);
            vaultService.exportGraphToVault(topic);
            
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } catch (e: any) {
            const message = e instanceof Error ? e.message : String(e);
            res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
            res.end();
        }
    }

    private async handleContextCaching(context: string, agentId: string, cacheKey: string) {
        try {
            const agentForCounting = pool.getAgent(agentId);
            const tokens = await agentForCounting?.countTokens(context) || 0;

            if (tokens > 4096) {
                return await contextCacheService.getOrCreateCache(
                    cacheKey, 
                    agentForCounting?.modelName || 'gemini-3.1-flash-preview',
                    "You are an expert AI agent working in the Astra Zenith industrial environment.",
                    context
                ) || undefined;
            }
        } catch (e) {
            console.warn('[Cache] Token counting or cache creation failed:', e);
        }
        return undefined;
    }

    private async executeGuardrailLoop(agentId: string, agentName: string, baseMessages: StreamMessage[], reply: string, res: Response, apiKey: string | undefined, cacheName: string | undefined, round: number) {
        let currentReply = reply;
        let retryCount = 0;
        while (retryCount < 1) {
            const guardResult = await pool.validateOutput(currentReply);
            if (guardResult.startsWith('[REJECT]')) {
                const feedback = guardResult.replace('[REJECT]', '').trim();
                pushLog(`⚠️ [Guardrail] A6 檢測到品質偏差，正在引導 ${agentName} 進行自我修正...`, 'warn');
                
                const correctionMessages: StreamMessage[] = [
                    ...baseMessages,
                    { role: 'assistant', content: currentReply },
                    { role: 'user', content: `【A6 修正指導】: ${feedback}\n請根據此意見重新生成更符合規格的回應。` }
                ];

                currentReply = "";
                res.write(`data: ${JSON.stringify({ agent: agentId, status: 'RETRY', round, feedback })}\n\n`);
                
                await pool.sendMessage(agentId, correctionMessages, (chunk) => {
                    const cleanChunk = chunk.replace(/\*\*/g, '').replace(/--/g, '');
                    currentReply += cleanChunk;
                    res.write(`data: ${JSON.stringify({ agent: agentId, chunk: cleanChunk, round, isCorrection: true })}\n\n`);
                }, apiKey, cacheName);

                retryCount++;
                pushLog(`✅ [Guardrail] ${agentName} 修正完成`, 'success');
            } else {
                break;
            }
        }
        return currentReply;
    }

    private recordTelemetry(usage: any, res: Response) {
        const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usage;
        const cachedCount = usage.cachedContentTokenCount || 0;
        telemetryService.recordUsage(promptTokenCount, candidatesTokenCount, cachedCount);
        
        res.write(`data: ${JSON.stringify({ 
            usage: { 
                in: promptTokenCount, 
                out: candidatesTokenCount, 
                cached: cachedCount,
                total: totalTokenCount
            } 
        })}\n\n`);
        pushLog(`📊 負載更新：消耗 ${totalTokenCount} tokens (包含快取: ${cachedCount})`, 'info', { usage });
    }

    private async applyDynamicDelay(modelName: string, lastOutputLength: number = 0) {
        const isGemma = modelName.toLowerCase().includes('gemma');
        const isFlash = modelName.toLowerCase().includes('flash');
        
        // Base delay + extra buffer if output was massive (to respect TPM/RPM)
        let delay = isGemma ? 500 : 2000;
        
        if (lastOutputLength > 4000) {
            delay += 3000; // Extra cooldown for heavy lifting
            pushLog(`❄️ [Cooling] 檢測到大規模輸出，強制冷卻 ${delay}ms 以規避 429`, 'info');
        } else if (!isFlash) {
            delay += 2000; // Pro models need more breathing room
        }

        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

export const missionOrchestrator = new MissionOrchestrator();
