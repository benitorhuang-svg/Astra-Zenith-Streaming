"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.missionOrchestrator = exports.MissionOrchestrator = void 0;
const Agent_1 = require("../models/Agent");
const LogService_1 = require("./LogService");
const ContextCacheService_1 = require("./ContextCacheService");
const TelemetryService_1 = require("./TelemetryService");
const VectorService_1 = require("./VectorService");
const CoreService_1 = require("./CoreService");
const config_1 = require("../core/config");
const HarnessEngineeringService_1 = require("./HarnessEngineeringService");
class MissionOrchestrator {
    async executeDiscussionStream(topic, agentIds, numRounds, res, apiKey) {
        (0, LogService_1.pushLog)(`🌀 [MissionOrchestrator] 啟動程序：${topic}`, 'info');
        const missionId = `mission-${Date.now()}`;
        HarnessEngineeringService_1.harnessService.initializeMission(missionId, topic);
        const routingResult = await Agent_1.pool.routeIntent(topic);
        if (!routingResult.allowed) {
            (0, LogService_1.pushLog)(`🚫 [Harness_Intercept] 已攔截：${routingResult.reason}`, 'error');
            res.write(`data: ${JSON.stringify({ error: `Harness_Intercept: ${routingResult.reason}` })}\n\n`);
            return res.end();
        }
        try {
            const localKnowledge = (0, CoreService_1.getLocalKnowledgeContext)();
            const missionSpec = `[SDD_MODIFIER: ${routingResult.sddModifier}]\n主題：${topic}\n${localKnowledge}`;
            const rootNodeId = `root-${missionId}`;
            await VectorService_1.vectorService.addNode(rootNodeId, topic, 'SYSTEM', undefined, 'ROOT', topic);
            let baseCacheName = undefined;
            if (config_1.isPaidTier && config_1.GEMINI_API_KEY) {
                const cacheResult = await this.handleContextCaching(missionSpec, agentIds[0], `${missionId}-base`);
                baseCacheName = cacheResult ?? undefined;
            }
            const history = [
                { role: 'user', content: `【核心規格】\n${missionSpec}` }
            ];
            for (let r = 0; r < numRounds; r++) {
                if (numRounds > 1)
                    res.write(`data: ${JSON.stringify({ round: r + 1, totalRounds: numRounds })}\n\n`);
                for (const agentId of agentIds) {
                    const agent = Agent_1.pool.getAgent(agentId);
                    if (!agent)
                        continue;
                    (0, LogService_1.pushLog)(`🧠 [${agentId}] ${agent.name} 運算中...`, 'info');
                    res.write(`data: ${JSON.stringify({ agent: agentId, status: 'START', round: r + 1 })}\n\n`);
                    const graphContextParts = await VectorService_1.vectorService.getGraphContextParts(topic, 5);
                    const harnessContext = HarnessEngineeringService_1.harnessService.getGoverningContext();
                    const messages = [
                        ...history,
                        {
                            role: 'user',
                            parts: [
                                ...graphContextParts,
                                { text: `\n【Harness 控制上下文】\n${harnessContext}\n\n請執行任務。` }
                            ]
                        }
                    ];
                    let fullReply = "";
                    const result = await Agent_1.pool.sendMessage(agentId, messages, (chunk) => {
                        const cleanChunk = chunk.replace(/\*\*/g, '').replace(/--/g, '');
                        fullReply += cleanChunk;
                        res.write(`data: ${JSON.stringify({ agent: agentId, chunk: cleanChunk, round: r + 1 })}\n\n`);
                    }, apiKey, baseCacheName);
                    const latestState = HarnessEngineeringService_1.harnessService.processOutput(agentId, fullReply);
                    res.write(`data: ${JSON.stringify({ type: 'HARNESS_UPDATE', state: latestState })}\n\n`);
                    const branchId = `branch-${Date.now()}-${agentId}`;
                    await VectorService_1.vectorService.addNode(branchId, fullReply.slice(0, 500), agentId, rootNodeId, 'BRANCH', `${agent.name} 階段報告`);
                    res.write(`data: ${JSON.stringify({ agent: agentId, status: 'END', round: r + 1 })}\n\n`);
                    fullReply = await this.executeGuardrailLoop(agentId, agent.name, messages, fullReply, res, apiKey, baseCacheName, r + 1);
                    const updatedState = HarnessEngineeringService_1.harnessService.processOutput(agentId, fullReply);
                    res.write(`data: ${JSON.stringify({ type: 'HARNESS_UPDATE', state: updatedState })}\n\n`);
                    (0, CoreService_1.extractFactsToMemory)(fullReply);
                    if (result && result.usage)
                        this.recordTelemetry(result.usage, res);
                    history.push({ role: 'model', content: fullReply });
                    // 🚀 SMART_CONTEXT_WINDOW (Sliding Buffer)
                    // Keep the Core Spec (index 0) + most recent turns
                    if (history.length > 12) {
                        const spec = history[0];
                        const lastTurns = history.slice(-10); // Keep last 10 messages (5 rounds)
                        history.length = 0;
                        history.push(spec, ...lastTurns);
                    }
                    await this.applyDynamicDelay(agent.modelName, fullReply.length);
                }
            }
            (0, LogService_1.pushLog)(`🛡️ [Harness] 掃描完成`, 'warn');
            // 💾 AUTO-ARCHIVE TO GOOGLE DRIVE (2026 Standards)
            const { driveService } = await Promise.resolve().then(() => __importStar(require('./DriveService')));
            const { GOOGLE_DRIVE_FOLDER_ID } = await Promise.resolve().then(() => __importStar(require('../core/config')));
            if (GOOGLE_DRIVE_FOLDER_ID) {
                const transcript = history.map(h => `### ${(h.role || 'UNKNOWN').toUpperCase()}\n${h.content}\n`).join('\n---\n\n');
                const fileName = `Discussion_${topic.slice(0, 20)}_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
                driveService.uploadFile(fileName, `# Mission: ${topic}\n\n${transcript}`, GOOGLE_DRIVE_FOLDER_ID)
                    .catch(err => console.error('⚠️ [Archive_Fail]', err));
            }
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
            res.end();
        }
        catch (e) {
            res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
            res.end();
        }
    }
    async handleContextCaching(context, agentId, cacheKey) {
        try {
            const agentForCounting = Agent_1.pool.getAgent(agentId);
            const tokens = await agentForCounting?.countTokens(context) || 0;
            if (tokens > 4096)
                return await ContextCacheService_1.contextCacheService.getOrCreateCache(cacheKey, agentForCounting?.modelName || 'gemini-3.1-flash-preview', "Expert AI.", context);
        }
        catch (e) {
            console.error('[Cache_Fail]', e);
        }
        return undefined;
    }
    async executeGuardrailLoop(agentId, agentName, baseMessages, reply, res, apiKey, cacheName, round) {
        let currentReply = reply;
        let retryCount = 0;
        while (retryCount < 1) {
            const guardResult = await Agent_1.pool.validateOutput(currentReply);
            const integrity = HarnessEngineeringService_1.harnessService.verifyIntegrity(agentId, currentReply);
            if (guardResult.startsWith('[REJECT]') || !integrity.valid) {
                const feedback = !integrity.valid ? `[HARNESS_FAIL]: ${integrity.reason}` : guardResult.replace('[REJECT]', '').trim();
                (0, LogService_1.pushLog)(`⚠️ [Guardrail] 修正 ${agentName}...`, 'warn');
                const correctionMessages = [
                    ...baseMessages,
                    { role: 'assistant', content: currentReply },
                    { role: 'user', content: `【Harness 修正指令】: ${feedback}` }
                ];
                currentReply = "";
                res.write(`data: ${JSON.stringify({ agent: agentId, status: 'RETRY', round, feedback })}\n\n`);
                await Agent_1.pool.sendMessage(agentId, correctionMessages, (chunk) => {
                    currentReply += chunk;
                    res.write(`data: ${JSON.stringify({ agent: agentId, chunk, round, isCorrection: true })}\n\n`);
                }, apiKey, cacheName);
                retryCount++;
            }
            else
                break;
        }
        return currentReply;
    }
    recordTelemetry(usage, res) {
        const { promptTokenCount, candidatesTokenCount, totalTokenCount, groundingMetadata } = usage;
        TelemetryService_1.telemetryService.recordUsage(promptTokenCount, candidatesTokenCount, usage.cachedContentTokenCount || 0, groundingMetadata);
        res.write(`data: ${JSON.stringify({ usage: { in: promptTokenCount, out: candidatesTokenCount, total: totalTokenCount } })}\n\n`);
    }
    async applyDynamicDelay(modelName, lastOutputLength = 0) {
        // 🚀 TIER_AWARE_DELAY_CALIBRATION (2026 Standards)
        let delay = 1000; // Base delay
        if (modelName.toLowerCase().includes('flash')) {
            delay = 500; // 🚀 Flash optimization
        }
        else if (modelName.toLowerCase().includes('pro')) {
            delay = 2000; // 🛡️ Pro stability
        }
        if (lastOutputLength > 5000)
            delay += 3000;
        await new Promise(resolve => setTimeout(resolve, delay));
    }
}
exports.MissionOrchestrator = MissionOrchestrator;
exports.missionOrchestrator = new MissionOrchestrator();
