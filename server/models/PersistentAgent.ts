import { type Content, type Part, type Tool } from '@google/genai';
import { getAstraClient } from '../core/client';
import { pushLog } from '../services/LogService';
import { getAgentConfig, DEFAULT_SAFETY_SETTINGS, isPaidTier } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';
import { telemetryService } from '../services/TelemetryService';
import { StreamMessage } from './AgentTypes';
import { errorText, shouldFallback, isRetryable, buildCandidateModels, extractStatusCode } from './AgentUtils';

// 🚀 SHARED_COOLDOWN_MAP
const modelCooldowns: Record<string, number> = {};

/**
 * 🚀 PERSISTENT_AGENT_HARNESS (2026 Resilience Edition)
 */
export class PersistentAgent {
    id: string;
    name: string;
    role: string;
    modelName: string;
    tools?: Tool[]; // 🚀 Typed Tools

    constructor(id: string, name: string, role: string, modelName: string, tools?: Tool[]) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.tools = tools;
        const targetModel = getAgentConfig(id)?.model;
        this.modelName = targetModel || modelName || 'gemini-3.1-flash-lite-preview';
    }

    updateModel() {
        const targetModel = getAgentConfig(this.id)?.model;
        if (targetModel) {
            this.modelName = targetModel;
            pushLog(`🔄 [${this.id}] 模型同步: ${this.modelName}`, 'info');
        }
    }

    async streamMessage(messages: StreamMessage[], onChunk: (text: string, metadata?: any) => void, apiKey?: string, overrideModel?: string): Promise<{ usage?: any }> {
        try {
            const client = getAstraClient(apiKey);
            
            // 🚀 UNIFIED_CONTENT_CONVERTER
            const contents: Content[] = messages
                .filter(m => (m.content && m.content.trim() !== '') || (m.parts && m.parts.length > 0))
                .map(m => {
                    let role = (m.role || 'user').toLowerCase();
                    if (role === 'assistant' || role === 'bot' || role === 'model') role = 'model';
                    else role = 'user';
                    
                    const parts: Part[] = m.parts || [{ text: m.content || "" }];
                    return { role, parts };
                });

            if (contents.length === 0) throw new Error('EMPTY_CONTENT');
            const cachedContent = (messages as any).cachedContent;

            return await externalApiGate.runExclusive(async () => {
                const model = overrideModel || this.modelName;
                const rawCandidates = buildCandidateModels(this.id, model);
                const candidates = rawCandidates.filter(m => (modelCooldowns[m] || 0) < Date.now());

                if (candidates.length === 0) throw new Error('SYSTEM_SATURATION');

                let lastError = '';
                for (const targetModel of candidates) {
                    let retries = 0;
                    const maxRetries = 2;

                    while (retries < maxRetries) {
                        try {
                            const budget = telemetryService.checkBudget(isPaidTier);
                            if (!budget.ok) {
                                if (budget.waitMs) await new Promise(r => setTimeout(r, budget.waitMs));
                                else throw new Error('DAILY_LIMIT');
                            }

                            pushLog(`[HARNESS] ${this.id} 呼叫: ${targetModel}${cachedContent ? ' (CACHE_HIT)' : ''}`, 'warn');
                            
                            const result = await client.models.generateContentStream({
                                model: targetModel,
                                contents,
                                config: {
                                    systemInstruction: this.role,
                                    temperature: 0.4, 
                                    topP: 0.95, 
                                    maxOutputTokens: 8192,
                                    safetySettings: DEFAULT_SAFETY_SETTINGS,
                                    tools: this.tools,
                                    cachedContent: cachedContent || undefined
                                }
                            });

                            let lastMetadata: any = null;
                            for await (const chunk of result) {
                                if (chunk.text) {
                                    // 🚀 GROUNDING_METADATA_AWARE
                                    const metadata = (chunk as any).groundingMetadata;
                                    if (metadata) lastMetadata = metadata;
                                    onChunk(chunk.text, metadata);
                                } else {
                                    // 🛡️ FINISH_REASON_ANALYSIS (V2 SDK Standard)
                                    const finishReason = (chunk as any).candidates?.[0]?.finishReason;
                                    if (finishReason && finishReason !== 'STOP') {
                                        pushLog(`⚠️ [${this.id}] 串流中斷原因: ${finishReason}`, 'error');
                                        onChunk(`\n\n[STREAM_INTERRUPTED: ${finishReason}]`);
                                    }
                                }
                            }

                            const finalUsage = (result as any).usageMetadata || {};
                            return { 
                                usage: {
                                    promptTokenCount: finalUsage.promptTokenCount || 0,
                                    candidatesTokenCount: finalUsage.candidatesTokenCount || 0,
                                    totalTokenCount: finalUsage.totalTokenCount || 0,
                                    cachedContentTokenCount: finalUsage.cachedContentTokenCount || 0,
                                    groundingMetadata: lastMetadata // 🚀 Pass back for telemetry
                                }
                            };

                        } catch (err: unknown) {
                            lastError = errorText(err);
                            const status = extractStatusCode(lastError);

                            if (status === 429) {
                                const backoff = Math.pow(2, retries + 1) * 30000;
                                modelCooldowns[targetModel] = Date.now() + backoff;
                                pushLog(`🚫 [${targetModel}] 配額耗盡，退避鎖定 ${backoff/1000}s`, 'error');
                                break; 
                            }

                            if (isRetryable(lastError) && retries < maxRetries - 1) {
                                retries++;
                                const delay = Math.pow(2, retries) * 1000 + (Math.random() * 1000);
                                pushLog(`⚠️ [Retry] ${targetModel} (${status}) 重試中...`, 'warn');
                                await new Promise(r => setTimeout(r, delay));
                                continue;
                            }

                            if (!shouldFallback(lastError)) throw err;
                            break; 
                        }
                    }
                }
                throw new Error(`Fallbacks exhausted: ${lastError}`);
            });
        } catch (e: unknown) {
            onChunk(`\n\n[SYSTEM_RECOVERY_FAILURE]: ${errorText(e)}`);
            return {};
        }
    }

    async reason(content: string | any[], systemPrompt?: string): Promise<string> {
        if (!content || (typeof content === 'string' && content.trim() === '')) return "";
        try {
            const result = await this._runWithFallback(async (model, client) => {
                const parts = Array.isArray(content) ? content : [{ text: content }];
                return await client.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts }],
                    config: {
                        systemInstruction: systemPrompt || this.role,
                        temperature: 0.5, 
                        maxOutputTokens: 4096,
                        safetySettings: DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });
            return result.text || "";
        } catch (e) { console.error(`[Reason_Fail]`, e); return ""; }
    }

    async reasonStructured<T>(content: string | any[], schema: any): Promise<T | null> {
        if (!content || (typeof content === 'string' && content.trim() === '')) return null;
        try {
            const result = await this._runWithFallback(async (model, client) => {
                const parts = Array.isArray(content) ? content : [{ text: content }];
                return await client.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts }],
                    config: {
                        systemInstruction: this.role,
                        temperature: 0.1, 
                        maxOutputTokens: 2048,
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        safetySettings: DEFAULT_SAFETY_SETTINGS
                    }
                });
            });

            const text = result.text;
            if (!text) return null;
            return JSON.parse(text) as T;
        } catch (e) {
            console.error(`[ReasonStructured_Fail]`, e);
            return null;
        }
    }

    async countTokens(content: string | StreamMessage[]): Promise<number> {
        try {
            const client = getAstraClient();
            
            // 🚀 TOKEN_ENGINE: Using the official Unified SDK countTokens API
            // Note: Local Tokenizer is available via @google/genai/tokenizer 
            // but for full multimodal accuracy, the API call is preferred in 2026.
            const contents = Array.isArray(content) 
                ? content.filter(m => m.content).map(m => ({ role: 'user' as any, parts: [{ text: m.content }] })) 
                : [{ role: 'user' as any, parts: [{ text: content || "" }] }];
            
            if (contents.length === 0) return 0;
            const countResult = await client.models.countTokens({ model: this.modelName, contents });
            return countResult.totalTokens || 0;
        } catch { return 0; }
    }

    private async _runWithFallback<T>(operation: (model: string, client: any) => Promise<T>): Promise<T> {
        const client = getAstraClient();
        return await externalApiGate.runExclusive(async () => {
            const candidates = buildCandidateModels(this.id, this.modelName).filter(m => (modelCooldowns[m] || 0) < Date.now());
            let lastError = '';
            for (const model of candidates) {
                try {
                    const result = await operation(model, client);
                    return result;
                } catch (err: unknown) {
                    lastError = errorText(err);
                    if (!shouldFallback(lastError)) throw err;
                    continue;
                }
            }
            throw new Error(`Fallbacks exhausted: ${lastError}`);
        });
    }
}
