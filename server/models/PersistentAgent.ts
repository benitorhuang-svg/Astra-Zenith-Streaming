import { getAstraClient } from '../core/client';
import { pushLog } from '../services/LogService';
import { getAgentConfig, DEFAULT_SAFETY_SETTINGS, isPaidTier } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';
import { telemetryService } from '../services/TelemetryService';
import { StreamMessage } from './AgentTypes';
import { errorText, shouldFallback, isRetryable, buildCandidateModels } from './AgentUtils';

/**
 * 🚀 PERSISTENT_AGENT_HARNESS (2026 Agent OS Standard)
 * Optimized for the new @google/genai Unified SDK with Retry & Budgeting.
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

    /**
     * 🛰️ MODEL_REFRESH: Force update the model based on current TIER configuration
     */
    updateModel() {
        const targetModel = getAgentConfig(this.id)?.model;
        if (targetModel) {
            this.modelName = targetModel;
            pushLog(`🔄 [${this.id}] ${this.name} 模型同步: ${this.modelName}`, 'info');
        }
    }

    async streamMessage(messages: StreamMessage[], onChunk: (text: string) => void, apiKey?: string): Promise<{ usage?: any }> {
        pushLog(`[HARNESS] ${this.id} 調用引擎: ${this.modelName}`, 'warn');

        try {
            const client = getAstraClient(apiKey);
            const contents = messages.map(m => {
                let role = (m.role || 'user').toLowerCase();
                if (role === 'assistant' || role === 'bot') role = 'model';
                return { role, parts: [{ text: m.content }] };
            });

            return await externalApiGate.runExclusive(async () => {
                const candidates = buildCandidateModels(this.id, this.modelName);
                let lastError = '';

                for (const model of candidates) {
                    let retries = 0;
                    const maxRetries = 3;

                    while (retries < maxRetries) {
                        try {
                            // 🛡️ Budget Check (PRM/PRD Protection)
                            const budget = telemetryService.checkBudget(isPaidTier);
                            if (!budget.ok) {
                                if (budget.waitMs && budget.waitMs > 0) {
                                    pushLog(`⏳ [Budget_Hold] 觸及速率邊界，等待 ${budget.waitMs}ms...`, 'info');
                                    await new Promise(r => setTimeout(r, budget.waitMs));
                                } else if (budget.reason === 'RPD_LIMIT_EXHAUSTED') {
                                    throw new Error('Daily Quota Fully Exhausted. Mission Aborted.');
                                }
                            }

                            const result = await client.models.generateContentStream({
                                model,
                                contents,
                                config: {
                                    systemInstruction: this.role,
                                    generationConfig: { temperature: 0.4, topP: 0.95, maxOutputTokens: 8192 },
                                    safetySettings: DEFAULT_SAFETY_SETTINGS,
                                    tools: this.tools,
                                    cachedContent: (messages as any).cachedContent
                                }
                            });

                            for await (const chunk of result) {
                                if (chunk.text) onChunk(chunk.text);
                            }

                            const usage = (result as any).usageMetadata;
                            this.modelName = model;
                            return { usage };

                        } catch (err: unknown) {
                            const em = errorText(err);
                            lastError = em;

                            if (isRetryable(em) && retries < maxRetries - 1) {
                                retries++;
                                const backoff = Math.pow(2, retries) * 1000;
                                pushLog(`⚠️ [Retry_${retries}/${maxRetries}] ${model} 遭遇暫時性失敗 (${em})，${backoff}ms 後重試...`, 'warn');
                                await new Promise(r => setTimeout(r, backoff));
                                continue;
                            }

                            console.warn(`[AGENT_FAILURE] ${this.id} model=${model}:`, em);
                            if (!shouldFallback(em)) throw err;
                            break; // Try next model candidate
                        }
                    }
                }
                throw new Error(`All candidate models failed for ${this.id}: ${lastError}`);
            });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            onChunk(`\n\n[ERROR: ${this.id}] 最終呼叫失敗：${message}`);
            return {};
        }
    }

    private async _runWithFallback<T>(operation: (model: string, client: any) => Promise<T>): Promise<T> {
        const client = getAstraClient();
        return await externalApiGate.runExclusive(async () => {
            const candidates = buildCandidateModels(this.id, this.modelName);
            let lastError = '';

            for (const model of candidates) {
                try {
                    const result = await operation(model, client);
                    this.modelName = model;
                    return result;
                } catch (err: unknown) {
                    const em = errorText(err);
                    lastError = em;
                    if (!shouldFallback(em)) throw err;
                    continue;
                }
            }
            throw new Error(`All candidate models failed: ${lastError}`);
        });
    }

    async reason(content: string, systemPrompt?: string): Promise<string> {
        try {
            const result = await this._runWithFallback(async (model, client) => {
                pushLog(`↳ reason() 嘗試模型: ${model}`, 'info');
                return await client.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts: [{ text: content }] }],
                    config: {
                        systemInstruction: systemPrompt || this.role,
                        generationConfig: {
                            temperature: 0.5,
                            maxOutputTokens: 4096,
                        },
                        safetySettings: DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });

            return result.text || "";
        } catch (e) {
            console.error(`[HARNESS_REASON_FAIL] ${this.id}:`, e);
            return "";
        }
    }

    async reasonStructured<T>(content: string, schema: any, systemPrompt?: string): Promise<T | null> {
        try {
            const result = await this._runWithFallback(async (model, client) => {
                return await client.models.generateContent({
                    model,
                    contents: [{ role: 'user', parts: [{ text: content }] }],
                    config: {
                        systemInstruction: systemPrompt || this.role,
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 2048,
                        },
                        safetySettings: DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });

            return result.text ? JSON.parse(result.text) : null;
        } catch (e) {
            console.error(`[HARNESS_STRUCT_FAIL] ${this.id}:`, e);
            return null;
        }
    }

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
