import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pushLog } from '../services/LogService';
import { pool, type StreamMessage } from '../models/Agent';
import { 
    saveConversationToCore, 
    extractFactsToMemory, 
    getLocalKnowledgeContext 
} from '../services/CoreService';
import { vectorService } from '../services/VectorService';
import { GEMINI_API_KEY, setGeminiKey, isPaidTier } from '../core/config';
import { contextCacheService } from '../services/ContextCacheService';
import { telemetryService } from '../services/TelemetryService';
import { vaultService } from '../services/ObsidianVaultService';
import { externalApiGate } from '../core/externalApiGate';
import fs from 'fs';
import path from 'path';

interface MissionInitiateBody {
    topic?: string;
    agent_sequence?: string[];
    apiKey?: string;
}

interface ImageRequestBody {
    prompt?: string;
    apiKey?: string;
}

interface ChatLegacyBody {
    messages?: Array<{ content?: string }>;
    agents?: number;
    rounds?: number;
}

interface GenerateStreamBody {
    messages?: Array<{ role?: string; content: string }>;
    agentId?: string;
    apiKey?: string;
}

const router = Router();

// Validation Schema
const MissionSchema = z.object({
    topic: z.string().min(2),
    agents: z.string().optional(),
    rounds: z.string().or(z.number()).optional().transform(v => parseInt(v as string) || 1),
    apiKey: z.string().optional()
});

// Resource Tracking (Local to Module for now)

/**
 * Mission Initiation
 */
const initiateHandler = async (req: Request, res: Response) => {
    try {
        const body = (req.body ?? {}) as MissionInitiateBody;
        if (!body) {
            throw new Error('Request body is missing');
        }
        console.log('[API] /initiate body:', JSON.stringify(body));
        const { topic, agent_sequence } = body;
        if (!topic) {
            throw new Error('topic is missing');
        }
        if (!agent_sequence || !Array.isArray(agent_sequence)) {
            console.error('[API] Validation failed: agent_sequence is', typeof agent_sequence);
            throw new Error('agent_sequence is missing or not an array');
        }

        // 🚀 HOT-RELOAD RECOVERY: If request body has apiKey, inject it back to RAM
        const { apiKey } = body;
        if (apiKey) {
            setGeminiKey(apiKey);
            pushLog(`🔗 偵測到會話金鑰，後端記憶體已重新同步。`, 'success');
        }

        // RE-INITIALIZE POOL FROM DISK BEFORE EACH MISSION
        const azDir = path.join(process.cwd(), 'Astra Zenith Streaming');
        const agentStatePath = path.join(azDir, '.az_core', 'AGENT_STATE.json');
        if (fs.existsSync(agentStatePath)) {
            const state = JSON.parse(fs.readFileSync(agentStatePath, 'utf8'));
            await pool.warmup(state.agent_pool);
            pushLog(`⚙️ 任務配置已同步 (版本: ${state.system.version})`, 'info');
        }

        pushLog(`🎯 任務啟動："${topic}" (序列: ${agent_sequence.join(' -> ')})`, 'warn');
        res.json({ status: 'SUCCESS', topic });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[API] /initiate error:', message);
        res.status(500).json({ error: message });
    }
};

router.post('/initiate', initiateHandler);
router.post('/mission/initiate', initiateHandler);

/**
 * Image Generation (Imagen 4.0 Ultra)
 */
router.post('/generate-image', async (req: Request, res: Response) => {
    try {
        const { prompt, apiKey } = (req.body ?? {}) as ImageRequestBody;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        pushLog(`🎨 啟動 Imagen 4.0 Ultra 繪圖：${prompt.slice(0, 30)}...`, 'warn');

        const key = apiKey || GEMINI_API_KEY;
        if (!key) throw new Error('API Key is missing');

        // Note: Using fetch for direct API access if SDK doesn't support specific Imagen 4 Ultra yet
        const response = await externalApiGate.runExclusive(async () => {
            return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "1:1",
                        imageSize: "1024x1024"
                    }
                })
            });
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Image generation failed');
        }

        const result = await response.json();
        const base64Image = result.predictions[0].bytesBase64;
        
        res.json({ status: 'SUCCESS', image: base64Image });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[IMAGE] Error:', message);
        res.status(500).json({ error: message });
    }
});

/**
 * Discussion Stream (Primary Engine)
 */
router.get('/stream', async (req: Request, res: Response) => {
    const validation = MissionSchema.safeParse(req.query);
    if (!validation.success) return res.status(400).json({ error: "參數驗證失敗", details: validation.error.format() });

    const { topic, agents, rounds: numRounds, apiKey } = validation.data;
    const agentIds = (agents || "").split(',').filter(Boolean);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Force flush the buffer for proxies (Vite/Nginx)
    res.write(':\n\n'); 

    pushLog(`🌀 [Agent_OS] 啟動戰略任務程序：${topic}`, 'info');

    // 🛡️ HARNESS_PRE_FLIGHT_ROUTING (A1 - Router)
    // 門神攔截：檢測意圖並注入 SDD 修飾符
    const routingResult = await pool.routeIntent(topic);
    if (!routingResult.allowed) {
        pushLog(`🚫 [Harness_Intercept] 請求已攔截：${routingResult.reason}`, 'error');
        res.write(`data: ${JSON.stringify({ error: `Harness_Intercept: ${routingResult.reason}` })}\n\n`);
        return res.end();
    }

    if (agentIds.length === 0) {
        res.write(`data: ${JSON.stringify({ error: "未選擇活躍代理" })}\n\n`);
        return res.end();
    }

    try {
        const localKnowledge = getLocalKnowledgeContext();
        // 🚀 SDD 規格驅動注入
        let currentContext = `[SDD_MODIFIER: ${routingResult.sddModifier}]\n${topic}\n${localKnowledge}`;

        for (let r = 0; r < numRounds; r++) {
            if (numRounds > 1) {
                pushLog(`🔄 執行第 ${r + 1} 輪探討 (SDD_CYCLE)...`, 'info');
                res.write(`data: ${JSON.stringify({ round: r + 1, totalRounds: numRounds })}\n\n`);
            }

            // Phase 5: Explicit Caching for Paid Tier (Gemini Cookbook)
            let cachedContentName: string | undefined = undefined;
            if (isPaidTier && GEMINI_API_KEY) {
                try {
                    const agentForCounting = pool.getAgent(agentIds[0]);
                    const tokens = await agentForCounting?.countTokens(currentContext) || 0;
                    
                    if (tokens > 4096) {
                        cachedContentName = await contextCacheService.getOrCreateCache(
                            `mission-${Date.now()}`, 
                            agentForCounting?.modelName || 'gemini-3.1-flash-preview',
                            "You are an expert AI agent working in the Astra Zenith industrial environment.",
                            currentContext
                        ) || undefined;
                    }
                } catch (e) {
                    console.warn('[Cache] Token counting or cache creation failed:', e);
                }
            }

            for (const agentId of agentIds) {
                const agent = pool.getAgent(agentId);
                if (!agent) continue;

                pushLog(`🧠 [${agentId}] ${agent.name} 正在運算回應...`, 'info');
                res.write(`data: ${JSON.stringify({ agent: agentId, status: 'START', round: r + 1 })}\n\n`);

                // 🧭 圖譜導航器：提取邏輯脈絡 (取代傳統 RAG)
                const graphContext = await vectorService.getGraphContext(topic, 5);
                
                // Gemini Cookbook: Optimized Prompt Sequence for Implicit Caching
                // Static elements go first to maintain a common prefix for as long as possible
                const messages: StreamMessage[] = [
                    { role: 'user', content: `【任務背景與核心規格】\n${currentContext}` },
                    { role: 'user', content: `【當前圖譜關聯】\n${graphContext}` },
                    { role: 'user', content: `請根據上述內容，進行分析或回應。` }
                ];

                let fullReply = "";
                const result = await pool.sendMessage(agentId, messages, (chunk) => {
                    const cleanChunk = chunk.replace(/\*\*/g, '').replace(/--/g, '');
                    fullReply += cleanChunk;
                    res.write(`data: ${JSON.stringify({ agent: agentId, chunk: cleanChunk, round: r + 1 })}\n\n`);
                }, apiKey, cachedContentName);

                // 🧠 AUTO-VECTORIZATION: Semantic Graph Injection
                if (fullReply.length > 30) {
                    try {
                        await vectorService.addNode(`node-${Date.now()}-${agentId}`, fullReply, agentId);
                    } catch (e) {
                        console.error('[ANALYSIS] Vectorization failed:', e);
                    }
                }

                res.write(`data: ${JSON.stringify({ agent: agentId, status: 'END', round: r + 1 })}\n\n`);
                
                // Phase 6: A6 Automated Correction Loop (Gemini Cookbook Guardrail)
                let retryCount = 0;
                while (retryCount < 1) { // Max 1 retry for efficiency
                    const guardResult = await pool.validateOutput(fullReply);
                    if (guardResult.startsWith('[REJECT]')) {
                        const feedback = guardResult.replace('[REJECT]', '').trim();
                        pushLog(`⚠️ [Guardrail] A6 檢測到品質偏差，正在引導 ${agent.name} 進行自我修正...`, 'warn');
                        
                        const correctionMessages: StreamMessage[] = [
                            ...messages,
                            { role: 'assistant', content: fullReply },
                            { role: 'user', content: `【A6 修正指導】: ${feedback}\n請根據此意見重新生成更符合規格的回應。` }
                        ];

                        fullReply = ""; // Reset for retry
                        res.write(`data: ${JSON.stringify({ agent: agentId, status: 'RETRY', round: r + 1, feedback })}\n\n`);
                        
                        await pool.sendMessage(agentId, correctionMessages, (chunk) => {
                            const cleanChunk = chunk.replace(/\*\*/g, '').replace(/--/g, '');
                            fullReply += cleanChunk;
                            res.write(`data: ${JSON.stringify({ agent: agentId, chunk: cleanChunk, round: r + 1, isCorrection: true })}\n\n`);
                        }, apiKey, cachedContentName);

                        retryCount++;
                        pushLog(`✅ [Guardrail] ${agent.name} 修正完成`, 'success');
                    } else {
                        break; // Passed validation
                    }
                }

                extractFactsToMemory(fullReply);

                // Phase 7: Gemini Cookbook — Accurate Telemetry Tracking
                if (result.usage) {
                    const { promptTokenCount, candidatesTokenCount, totalTokenCount } = result.usage;
                    const cachedCount = (result.usage as any).cachedContentTokenCount || 0;
                    telemetryService.recordUsage(promptTokenCount, candidatesTokenCount, cachedCount);
                    
                    res.write(`data: ${JSON.stringify({ 
                        usage: { 
                            in: promptTokenCount, 
                            out: candidatesTokenCount, 
                            cached: cachedCount,
                            total: totalTokenCount
                        } 
                    })}\n\n`);
                    pushLog(`📊 負載更新：消耗 ${totalTokenCount} tokens (包含快取: ${cachedCount})`, 'info', { usage: result.usage });
                }
                
                currentContext += `\n\n[${agent.name}]: ${fullReply}`;

                // MOE OPTIMIZATION: Reduce delay for Gemma models
                const isGemma = agent.modelName.toLowerCase().includes('gemma');
                const dynamicDelay = isGemma ? 300 : 1500;
                await new Promise(resolve => setTimeout(resolve, dynamicDelay));
            }
        }

        // ⚓ HARNESS_POST_FLIGHT_GUARDRAIL (A6 - Guardrail)
        // 最終安全審核：防止機密外洩或邏輯死角
        pushLog(`🛡️ [Harness] 正在執行輸出安全掃描...`, 'warn');
        const secureContext = await pool.validateOutput(currentContext);

        saveConversationToCore(topic, secureContext);
        
        // 🗄️ 知識沉澱：匯出為 Obsidian Markdown 實體檔案
        try {
            vaultService.exportGraphToVault(topic);
        } catch (e) {
            console.error('[Vault] Export failed:', e);
        }
        
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
    }
});

/**
 * Legacy Chat Bridge (Maintenance Node)
 */
router.post('/chat-legacy', async (req: Request, res: Response) => {
    const { messages, agents, rounds } = (req.body ?? {}) as ChatLegacyBody;
    const messageList = messages ?? [];
    const prompt = messageList[messageList.length - 1]?.content || "";

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const currentContext = prompt;
        const activeAgentIds = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'].slice(0, agents || 1);

        for (let r = 0; r < (rounds || 1); r++) {
            for (const agentId of activeAgentIds) {
                const agent = pool.getAgent(agentId);
                if (!agent) continue;
                res.write(`data: ${JSON.stringify({ agent: agentId, chunk: `\n\n[${agent.name}]: ` })}\n\n`);
                await pool.sendMessage(agentId, [{ role: 'user', content: currentContext }], (chunk) => {
                    res.write(`data: ${JSON.stringify({ agent: agentId, chunk })}\n\n`);
                });
            }
        }
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
        res.end();
    }
});

router.post('/generate-stream', async (req: Request, res: Response) => {
    const { messages, agentId, apiKey } = (req.body ?? {}) as GenerateStreamBody;
    const id = agentId || 'A1';

    // BACKEND_AUTH_FALLBACK: Use global key if session key is not provided in body
    const effectiveKey = apiKey || GEMINI_API_KEY;

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
    }

    // Ensure response is sent as a chunked/plain text stream to the client
    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        // flush headers to ensure proxies don't buffer
        if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
        // Prime the connection so some proxies start streaming immediately
        try { res.write('\n'); } catch { /* noop */ }

        const agent = pool.getAgent(id);
        if (!agent) throw { status: 404, message: `Agent ${id} not found` };

        await pool.sendMessage(id, messages, (chunk) => {
            try {
                res.write(String(chunk));
            } catch {
                /* silent skip write fail */
            }
        }, effectiveKey);

        // Graceful end of stream
        try { res.end(); } catch { /* noop */ }
    } catch (_e: any) {
        const statusCode = typeof _e === 'object' && _e !== null && 'status' in _e && typeof (_e as any).status === 'number' ? (_e as any).status : 500;
        const message = _e instanceof Error ? _e.message : (typeof _e === 'object' && _e !== null && 'message' in _e ? String((_e as any).message) : String(_e));
        console.error('[GENERATE_STREAM_FAIL]:', message);
        // If headers already sent, attempt to write an error chunk, otherwise send json
        if (res.headersSent) {
            try {
                res.write(`\n[ERROR]: ${message}`);
                res.end();
            } catch {
                /* noop */
            }
        } else {
            res.status(statusCode).json({ error: message || 'Internal Server Error' });
        }
    }
});

export default router;
