import { Response } from 'express';
import { pool, type StreamMessage } from '../models/Agent';
import { pushLog } from './LogService';
import { contextCacheService } from './ContextCacheService';
import { telemetryService } from './TelemetryService';
import { vectorService } from './VectorService';
import { 
    extractFactsToMemory, 
    getLocalKnowledgeContext 
} from './CoreService';
import { GEMINI_API_KEY, isPaidTier } from '../core/config';
import { harnessService } from './HarnessEngineeringService';

export class MissionOrchestrator {
    
    async executeDiscussionStream(
        topic: string, 
        agentIds: string[], 
        numRounds: number, 
        res: Response, 
        apiKey?: string
    ) {
        pushLog(`🌀 [MissionOrchestrator] 啟動程序：${topic}`, 'info');

        const missionId = `mission-${Date.now()}`;
        harnessService.initializeMission(missionId, topic);

        const routingResult = await pool.routeIntent(topic);
        if (!routingResult.allowed) {
            pushLog(`🚫 [Harness_Intercept] 已攔截：${routingResult.reason}`, 'error');
            res.write(`data: ${JSON.stringify({ error: `Harness_Intercept: ${routingResult.reason}` })}\n\n`);
            return res.end();
        }

        try {
            const localKnowledge = getLocalKnowledgeContext();
            const missionSpec = `[SDD_MODIFIER: ${routingResult.sddModifier}]\n主題：${topic}\n${localKnowledge}`;
            const rootNodeId = `root-${missionId}`;
            await vectorService.addNode(rootNodeId, topic, 'SYSTEM', undefined, 'ROOT', topic);

            let baseCacheName: string | undefined = undefined;
            if (isPaidTier && GEMINI_API_KEY) {
                baseCacheName = await this.handleContextCaching(missionSpec, agentIds[0], `${missionId}-base`);
            }

            const history: StreamMessage[] = [
                { role: 'user', content: `【核心規格】\n${missionSpec}` }
            ];

            for (let r = 0; r < numRounds; r++) {
                if (numRounds > 1) res.write(`data: ${JSON.stringify({ round: r + 1, totalRounds: numRounds })}\n\n`);

                for (const agentId of agentIds) {
                    const agent = pool.getAgent(agentId);
                    if (!agent) continue;

                    pushLog(`🧠 [${agentId}] ${agent.name} 運算中...`, 'info');
                    res.write(`data: ${JSON.stringify({ agent: agentId, status: 'START', round: r + 1 })}\n\n`);

                    const graphContext = await vectorService.getGraphContext(topic, 5);
                    const harnessContext = harnessService.getGoverningContext();

                    const messages: StreamMessage[] = [
                        ...history,
                        { role: 'user', content: `【關聯圖譜】\n${graphContext}\n${harnessContext}\n\n請執行任務。` }
                    ];

                    let fullReply = "";
                    const result = await pool.sendMessage(agentId, messages, (chunk) => {
                        const cleanChunk = chunk.replace(/\*\*/g, '').replace(/--/g, '');
                        fullReply += cleanChunk;
                        res.write(`data: ${JSON.stringify({ agent: agentId, chunk: cleanChunk, round: r + 1 })}\n\n`);
                    }, apiKey, baseCacheName);

                    const latestState = harnessService.processOutput(agentId, fullReply);
                    res.write(`data: ${JSON.stringify({ type: 'HARNESS_UPDATE', state: latestState })}\n\n`);

                    const branchId = `branch-${Date.now()}-${agentId}`;
                    await vectorService.addNode(branchId, fullReply.slice(0, 500), agentId, rootNodeId, 'BRANCH', `${agent.name} 階段報告`);

                    res.write(`data: ${JSON.stringify({ agent: agentId, status: 'END', round: r + 1 })}\n\n`);
                    
                    fullReply = await this.executeGuardrailLoop(agentId, agent.name, messages, fullReply, res, apiKey, baseCacheName, r + 1);

                    const updatedState = harnessService.processOutput(agentId, fullReply);
                    res.write(`data: ${JSON.stringify({ type: 'HARNESS_UPDATE', state: updatedState })}\n\n`);
                    
                    extractFactsToMemory(fullReply);
                    if (result && result.usage) this.recordTelemetry(result.usage, res);
                    history.push({ role: 'model', content: fullReply });
                    
                    if (history.length > 10) {
                        const spec = history[0];
                        const recent = history.slice(-8);
                        history.length = 0;
                        history.push(spec, ...recent);
                    }
                    await this.applyDynamicDelay(agent.modelName, fullReply.length);
                }
            }

            pushLog(`🛡️ [Harness] 掃描完成`, 'warn');
            
            // 💾 AUTO-ARCHIVE TO GOOGLE DRIVE (2026 Standards)
            const { driveService } = await import('./DriveService');
            const { GOOGLE_DRIVE_FOLDER_ID } = await import('../core/config');
            if (GOOGLE_DRIVE_FOLDER_ID) {
                const transcript = history.map(h => `### ${h.role.toUpperCase()}\n${h.content}\n`).join('\n---\n\n');
                const fileName = `Discussion_${topic.slice(0, 20)}_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
                driveService.uploadFile(fileName, `# Mission: ${topic}\n\n${transcript}`, GOOGLE_DRIVE_FOLDER_ID)
                    .catch(err => console.error('⚠️ [Archive_Fail]', err));
            }

            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        } catch (e: any) {
            res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
            res.end();
        }
    }

    private async handleContextCaching(context: string, agentId: string, cacheKey: string) {
        try {
            const agentForCounting = pool.getAgent(agentId);
            const tokens = await agentForCounting?.countTokens(context) || 0;
            if (tokens > 4096) return await contextCacheService.getOrCreateCache(cacheKey, agentForCounting?.modelName || 'gemini-3.1-flash-preview', "Expert AI.", context);
        } catch (e) { console.error('[Cache_Fail]', e); }
        return undefined;
    }

    private async executeGuardrailLoop(agentId: string, agentName: string, baseMessages: StreamMessage[], reply: string, res: Response, apiKey: string | undefined, cacheName: string | undefined, round: number) {
        let currentReply = reply;
        let retryCount = 0;
        while (retryCount < 1) {
            const guardResult = await pool.validateOutput(currentReply);
            const integrity = harnessService.verifyIntegrity(agentId, currentReply);

            if (guardResult.startsWith('[REJECT]') || !integrity.valid) {
                const feedback = !integrity.valid ? `[HARNESS_FAIL]: ${integrity.reason}` : guardResult.replace('[REJECT]', '').trim();
                pushLog(`⚠️ [Guardrail] 修正 ${agentName}...`, 'warn');
                
                const correctionMessages: StreamMessage[] = [
                    ...baseMessages,
                    { role: 'assistant', content: currentReply },
                    { role: 'user', content: `【Harness 修正指令】: ${feedback}` }
                ];

                currentReply = "";
                res.write(`data: ${JSON.stringify({ agent: agentId, status: 'RETRY', round, feedback })}\n\n`);
                await pool.sendMessage(agentId, correctionMessages, (chunk) => {
                    currentReply += chunk;
                    res.write(`data: ${JSON.stringify({ agent: agentId, chunk, round, isCorrection: true })}\n\n`);
                }, apiKey, cacheName);
                retryCount++;
            } else break;
        }
        return currentReply;
    }

    private recordTelemetry(usage: any, res: Response) {
        const { promptTokenCount, candidatesTokenCount, totalTokenCount } = usage;
        telemetryService.recordUsage(promptTokenCount, candidatesTokenCount, usage.cachedContentTokenCount || 0);
        res.write(`data: ${JSON.stringify({ usage: { in: promptTokenCount, out: candidatesTokenCount, total: totalTokenCount } })}\n\n`);
    }

    private async applyDynamicDelay(modelName: string, lastOutputLength: number = 0) {
        let delay = modelName.toLowerCase().includes('gemma') ? 500 : 2000;
        if (lastOutputLength > 4000) delay += 3000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}

export const missionOrchestrator = new MissionOrchestrator();
