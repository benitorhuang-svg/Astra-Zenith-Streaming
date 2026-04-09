import path from 'path';
import fs from 'fs';
import { getAstraClient } from '../core/client';
import { pushLog } from '../services/LogService';
import { getAgentConfig, MODEL_FALLBACKS, DEFAULT_SAFETY_SETTINGS } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';

interface AgentPoolEntry {
    id: string;
    name: string;
    role?: string;
    prompt_ref?: string;
    model: string;
}

export interface StreamMessage {
    role?: string;
    content: string;
}

const LEADER_FALLBACK_MODELS = [
    'gemini-3.1-pro-preview',
    'gemini-3-flash-preview',
    'gemma-4-31b-it',
    'gemini-2.1-pro'
];

const WORKER_FALLBACK_MODELS = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3-flash-preview',
    'gemma-4-26b-a4b-it',
    'gemini-2.1-flash'
];

function dedupeModels(models: Array<string | undefined | null>): string[] {
    return Array.from(new Set(models.filter((model): model is string => typeof model === 'string' && model.length > 0)));
}

function errorText(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'object' && error !== null) {
        const maybeError = error as { message?: unknown; error?: { message?: unknown } };
        if (typeof maybeError.message === 'string') return maybeError.message;
        if (maybeError.error && typeof maybeError.error.message === 'string') return maybeError.error.message;
        try {
            return JSON.stringify(error);
        } catch {
            return String(error);
        }
    }
    return String(error);
}

function extractStatusCode(message: string): number | undefined {
    const patterns = [
        /"code"\s*:\s*(\d{3})/i,
        /\bHTTP_STATUS_(\d{3})\b/i,
        /\bSTATUS_(\d{3})\b/i,
        /\bcode\s*[:=]\s*(\d{3})\b/i,
    ];

    for (const pattern of patterns) {
        const match = message.match(pattern);
        if (match) return Number(match[1]);
    }

    return undefined;
}

function shouldFallback(message: string): boolean {
    const status = extractStatusCode(message);
    if (status === 400 || status === 401) return false;
    if (status && [403, 404, 408, 409, 429, 500, 502, 503, 504].includes(status)) return true;
    return /quota|resource_exhausted|not found|not supported|unavailable|deadline exceeded|too many requests|rate limit|permission denied|temporarily unavailable/i.test(message);
}

function buildCandidateModels(agentId: string, primaryModel: string): string[] {
    const roleFallbacks = agentId === 'A1' || agentId === 'A6' ? LEADER_FALLBACK_MODELS : WORKER_FALLBACK_MODELS;
    return dedupeModels([primaryModel, ...roleFallbacks, ...MODEL_FALLBACKS]);
}

/**
 * 🚀 PERSISTENT_AGENT_HARNESS (2026 Agent OS Standard)
 * Optimized for the new @google/genai Unified SDK.
 */
export class PersistentAgent {
    id: string;
    name: string;
    role: string;
    modelName: string;
    tools?: any[];

    constructor(id: string, name: string, role: string, modelName: string, tools?: any[]) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.tools = tools;
        
        // Use the model from configuration
        const targetModel = getAgentConfig(id)?.model;
        this.modelName = targetModel || modelName || 'gemini-3.1-flash-lite-preview';
        
        console.log(`[AGENT_INIT] ${id} initialized with model: ${this.modelName}`);
    }

    async streamMessage(messages: StreamMessage[], onChunk: (text: string) => void, apiKey?: string): Promise<{ usage?: any }> {
        pushLog(`[HARNESS] ${this.id} 調用引擎: ${this.modelName}`, 'warn');

        try {
            const client = getAstraClient(apiKey);

            const contents = messages.map(m => {
                let role = (m.role || 'user').toLowerCase();
                if (role === 'assistant' || role === 'bot') role = 'model';
                return {
                    role: role,
                    parts: [{ text: m.content }]
                };
            });

            // Acquire global external-API gate to ensure only one external call at a time
            const release = await externalApiGate.acquire();
            try {
                const candidates = buildCandidateModels(this.id, this.modelName);
                let lastError = '';

                for (const model of candidates) {
                    try {
                        pushLog(`↳ 嘗試模型: ${model}`, 'info');
                        const result = await client.models.generateContentStream({
                            model,
                            contents: contents,
                            systemInstruction: this.role,
                            config: {
                                temperature: 0.7,
                                topP: 0.95,
                                maxOutputTokens: 4096,
                                safetySettings: DEFAULT_SAFETY_SETTINGS,
                                tools: this.tools,
                                cachedContent: (messages as any).cachedContent
                            }
                        });

                        for await (const chunk of result) {
                            const text = typeof (chunk as any).text === 'function' ? (chunk as any).text() : (chunk as any).text;
                            if (text) onChunk(text);
                        }

                        // Capture and return usage metadata after stream consumption
                        const response = await (result as any).response;
                        const usage = response?.usageMetadata;
                        
                        this.modelName = model;
                        return { usage };
                    } catch (modelErr: unknown) {
                        const modelMsg = errorText(modelErr);
                        lastError = modelMsg;
                        console.warn(`[AGENT_FALLBACK] ${this.id} model=${model} failed:`, modelMsg);
                        if (!shouldFallback(modelMsg)) {
                            throw modelErr;
                        }
                        continue;
                    }
                }

                throw new Error(`All candidate models failed for agent ${this.id}: ${lastError}`);
            } finally {
                // Release the gate after stream consumption or failure
                try { release(); } catch { /* noop */ }
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.error(`🔴 [AGENT_ERROR] ${this.id} (${this.modelName}):`, message);
            onChunk(`\n\n[ERROR: ${this.id}] 呼叫模型失敗：${message || 'Unknown Error'}`);
            return {};
        }
    }

    async reason(content: string, systemPrompt?: string): Promise<string> {
        try {
            const client = getAstraClient();
            const result = await externalApiGate.runExclusive(async () => {
                const candidates = buildCandidateModels(this.id, this.modelName);
                let lastError = '';

                for (const model of candidates) {
                    try {
                        pushLog(`↳ reason() 嘗試模型: ${model}`, 'info');
                        const resp = await client.models.generateContent({
                            model,
                            contents: [{ role: 'user', parts: [{ text: content }] }],
                            systemInstruction: systemPrompt || this.role,
                            config: {
                                safetySettings: DEFAULT_SAFETY_SETTINGS,
                                tools: this.tools
                            }
                        });
                        this.modelName = model;
                        return resp;
                    } catch (err: unknown) {
                        const em = errorText(err);
                        lastError = em;
                        console.warn(`[AGENT_FALLBACK] reason() ${this.id} model=${model} failed:`, em);
                        if (!shouldFallback(em)) {
                            throw err;
                        }
                        continue;
                    }
                }

                throw new Error(`All candidate models failed: ${lastError}`);
            });

            // In new SDK, the result may have a .text() method or .text property
            const txt = typeof (result as any).text === 'function' ? (result as any).text() : (result as any).text;
            return txt || "";
        } catch (e) {
            console.error(`[HARNESS_REASON_FAIL] ${this.id}:`, e);
            return "";
        }
    }

    /**
     * Gemini Cookbook: Structured Output (JSON Mode)
     * Provides machine-readable decisions.
     */
    async reasonStructured<T>(content: string, schema: any, systemPrompt?: string): Promise<T | null> {
        try {
            const client = getAstraClient();
            const result = await externalApiGate.runExclusive(async () => {
                const candidates = buildCandidateModels(this.id, this.modelName);
                let lastError = '';

                for (const model of candidates) {
                    try {
                        pushLog(`↳ reasonStructured() 嘗試模型: ${model}`, 'info');
                        const resp = await client.models.generateContent({
                            model,
                            contents: [{ role: 'user', parts: [{ text: content }] }],
                            systemInstruction: systemPrompt || this.role,
                            config: {
                                responseMimeType: 'application/json',
                                responseSchema: schema,
                                safetySettings: DEFAULT_SAFETY_SETTINGS,
                                tools: this.tools
                            }
                        });
                        this.modelName = model;
                        return resp;
                    } catch (err: unknown) {
                        const em = errorText(err);
                        lastError = em;
                        console.warn(`[AGENT_FALLBACK] structured ${this.id} model=${model} failed:`, em);
                        if (!shouldFallback(em)) throw err;
                        continue;
                    }
                }
                throw new Error(`All candidate models failed: ${lastError}`);
            });

            const txt = typeof (result as any).text === 'function' ? (result as any).text() : (result as any).text;
            return txt ? JSON.parse(txt) : null;
        } catch (e) {
            console.error(`[HARNESS_STRUCT_FAIL] ${this.id}:`, e);
            return null;
        }
    }

    /**
     * Gemini Cookbook: Token Counting (Quota Awareness)
     */
    async countTokens(content: string | StreamMessage[]): Promise<number> {
        try {
            const client = getAstraClient();
            const contents = Array.isArray(content) 
                ? content.map(m => ({ role: m.role || 'user', parts: [{ text: m.content }] })) 
                : [{ role: 'user', parts: [{ text: content }] }];
            const countResult = await (client as any).models.countTokens({
                model: this.modelName,
                contents
            });
            return countResult.totalTokens || 0;
        } catch {
            return 0;
        }
    }
}

/**
 * 🛰️ AGENT_OS_POOL_MANAGER (The Orchestrator)
 */
export class AgentPoolManager {
    agents: Map<string, PersistentAgent> = new Map();

    async warmup(config: AgentPoolEntry[]) {
        pushLog('🛰️ [Agent_OS] 正在重建 6-Agent 協作網路 (2026 Unified SDK)...', 'info');
        this.agents.clear();
        const baseDir = path.join(process.cwd(), 'Astra Zenith Streaming');
        
        for (const a of config) {
            let role = a.role || "You are a helpful industrial agent.";
            if (a.prompt_ref) {
                const promptPath = path.join(baseDir, a.prompt_ref);
                if (fs.existsSync(promptPath)) {
                    role = fs.readFileSync(promptPath, 'utf8');
                }
            }
            
            // Phase 3: Wisdom Enrichment (Gemini Cookbook Tools)
            let tools: any[] | undefined = undefined;
            if (a.id === 'A3') {
                // Grounding with Google Search for Researcher
                tools = [{ googleSearchRetrieval: {} }];
            }

            const agent = new PersistentAgent(a.id, a.name, role, a.model, tools);
            this.agents.set(a.id, agent);
            pushLog(`✅ [${a.id}] ${a.name} (${agent.modelName}) 已就緒`, 'success');
        }
    }

    getAgent(id: string) { return this.agents.get(id); }

    async routeIntent(topic: string): Promise<{ allowed: boolean, reason: string, sddModifier: string }> {
        const router = this.getAgent('A1');
        if (!router) return { allowed: true, reason: '', sddModifier: '' };

        const intentSchema = {
            type: 'OBJECT',
            properties: {
                allowed: { type: 'BOOLEAN', description: '是否允許技術請求' },
                reason: { type: 'STRING', description: '拒絕原因或意圖簡述' },
                sddModifier: { type: 'STRING', description: 'SDD規格修飾符（若為技術請求）' }
            },
            required: ['allowed', 'reason', 'sddModifier']
        };

        const result = await router.reasonStructured<{ allowed: boolean, reason: string, sddModifier: string }>(
            `分析用戶意圖： "${topic}"。判斷此為閒聊(拒絕)或技術請求(核准)。`,
            intentSchema
        );

        return result || { allowed: true, reason: 'Fallback to permissive mode', sddModifier: '' };
    }

    async validateOutput(content: string): Promise<string> {
        const guard = this.getAgent('A6');
        if (!guard) return content;
        const check = await guard.reason(`檢查內容安全性：\n\n${content.slice(0, 1000)}`);
        return check || content;
    }

    async sendMessage(id: string, messages: StreamMessage[], onChunk: (chunk: string) => void, apiKey?: string, cachedContent?: string) {
        const agent = this.agents.get(id);
        if (!agent) throw new Error(`代理 ${id} 未掛載`);
        if (cachedContent) (messages as any).cachedContent = cachedContent;
        return await agent.streamMessage(messages, onChunk, apiKey);
    }
}

export const pool = new AgentPoolManager();
