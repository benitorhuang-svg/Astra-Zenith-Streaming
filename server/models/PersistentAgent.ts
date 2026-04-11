import { getAstraClient } from '../core/client';
import { pushLog } from '../services/LogService';
import { getAgentConfig, DEFAULT_SAFETY_SETTINGS, isPaidTier } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';
import { telemetryService } from '../services/TelemetryService';
import { StreamMessage } from './AgentTypes';
import { errorText, shouldFallback, isRetryable, buildCandidateModels, extractStatusCode } from './AgentUtils';

// 🚀 SHARED_COOLDOWN_MAP: Track models that are currently exhausted
const modelCooldowns: Record<string, number> = {};

/**
 * 🚀 PERSISTENT_AGENT_HARNESS (2026 Resilience Edition)
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

    async streamMessage(messages: StreamMessage[], onChunk: (text: string) => void, apiKey?: string, overrideModel?: string): Promise<{ usage?: any }> {
        try {
            const client = getAstraClient(apiKey);
            const contents = messages.filter(m => m.content && m.content.trim() !== '').map(m => {
                let role = (m.role || 'user').toLowerCase();
                if (role === 'assistant' || role === 'bot' || role === 'model') role = 'model';
                else role = 'user';
                return { role, parts: [{ text: m.content }] };
            });

            if (contents.length === 0) throw new Error('EMPTY_CONTENT');

            return await externalApiGate.runExclusive(async () => {
                const rawCandidates = buildCandidateModels(this.id, overrideModel || this.modelName);
                
                // 🛡️ COOLDOWN_FILTER: Remove models that are currently in cooling state
                const now = Date.now();
                const candidates = rawCandidates.filter(m => {
                    const cooldownUntil = modelCooldowns[m] || 0;
                    if (now < cooldownUntil) {
                        console.log(`[Harness_Cooling] Skipping ${m} (Still in penalty for ${Math.ceil((cooldownUntil - now)/1000)}s)`);
                        return false;
                    }
                    return true;
                });

                if (candidates.length === 0) {
                    throw new Error('All candidate models are currently in cooldown penalty. System saturation reached.');
                }

                let lastError = '';
                for (const model of candidates) {
                    let retries = 0;
                    const maxRetries = 2;

                    while (retries < maxRetries) {
                        try {
                            const budget = telemetryService.checkBudget(isPaidTier);
                            if (!budget.ok) {
                                if (budget.waitMs && budget.waitMs > 0) {
                                    await new Promise(r => setTimeout(r, budget.waitMs));
                                } else throw new Error('DAILY_LIMIT');
                            }

                            pushLog(`[HARNESS] ${this.id} 呼叫: ${model}`, 'warn');
                            const result = await client.models.generateContentStream({
                                model,
                                contents,
                                config: {
                                    systemInstruction: this.role,
                                    generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 8192 },
                                    safetySettings: DEFAULT_SAFETY_SETTINGS,
                                    tools: this.tools
                                }
                            });

                            for await (const chunk of result) {
                                if (chunk.text) onChunk(chunk.text);
                            }

                            const usage = (result as any).usageMetadata;
                            return { usage };

                        } catch (err: unknown) {
                            const em = errorText(err);
                            const status = extractStatusCode(em);
                            lastError = em;

                            // 🚨 QUOTA_EXHAUSTED_PENALTY: Apply shared cooldown
                            if (status === 429) {
                                const retryAfterMatch = em.match(/retry in ([\d.]+)s/);
                                const delay = retryAfterMatch ? parseFloat(retryAfterMatch[1]) * 1000 : 60000;
                                modelCooldowns[model] = Date.now() + delay;
                                pushLog(`🚫 [${model}] 配額耗盡，進入冷卻鎖定 ${Math.ceil(delay/1000)}s`, 'error');
                                break; // Don't retry this model, move to next candidate immediately
                            }

                            if (isRetryable(em) && retries < maxRetries - 1) {
                                retries++;
                                const backoff = Math.pow(2, retries) * 1000 + (Math.random() * 1000);
                                pushLog(`⚠️ [Retry] ${model} (${status}) 重試中...`, 'warn');
                                await new Promise(r => setTimeout(r, backoff));
                                continue;
                            }

                            if (!shouldFallback(em)) throw err;
                            break; 
                        }
                    }
                }
                throw new Error(`Execution Failed: ${lastError}`);
            });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            onChunk(`\n\n[SYSTEM_RECOVERY_FAILURE]: ${message}\n建議動作：暫停 60 秒後重試，或切換至已付費 API Key。`);
            return {};
        }
    }

    async reason(content: string, systemPrompt?: string): Promise<string> {
        if (!content || content.trim() === '') return "";
        try {
            const result = await this._runWithFallback(async (model, client) => {
                return await client.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts: [{ text: content }] }],
                    config: {
                        systemInstruction: systemPrompt || this.role,
                        generationConfig: { temperature: 0.5, maxOutputTokens: 4096 },
                        safetySettings: DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });
            return result.text || "";
        } catch (e) { console.error(`[Reason_Fail]`, e); return ""; }
    }

    async reasonStructured<T>(content: string, schema: any): Promise<T | null> {
        if (!content || content.trim() === '') return null;
        try {
            const result = await this._runWithFallback(async (model, client) => {
                return await client.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts: [{ text: content }] }],
                    config: {
                        systemInstruction: this.role,
                        generationConfig: { 
                            temperature: 0.1, 
                            maxOutputTokens: 2048,
                            responseMimeType: 'application/json',
                            responseSchema: schema
                        },
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
            const contents = Array.isArray(content) 
                ? content.filter(m => m.content).map(m => ({ role: 'user', parts: [{ text: m.content }] })) 
                : [{ role: 'user', parts: [{ text: content || "" }] }];
            if (contents.length === 0) return 0;
            const countResult = await (client as any).models.countTokens({ model: this.modelName, contents });
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
