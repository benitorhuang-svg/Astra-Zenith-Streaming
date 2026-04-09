import { getAstraClient } from '../core/client';
import { pushLog } from '../services/LogService';
import { getAgentConfig, DEFAULT_SAFETY_SETTINGS } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';
import { StreamMessage } from './AgentTypes';
import { errorText, shouldFallback, buildCandidateModels } from './AgentUtils';

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

    /**
     * Synchronize model with global AGENT_OS_CONFIG (Tier-Aware)
     */
    updateModel(): void {
        const targetModel = getAgentConfig(this.id)?.model;
        if (targetModel && this.modelName !== targetModel) {
            this.modelName = targetModel;
            console.log(`[AGENT_SYNC] ${this.id} model updated to: ${this.modelName}`);
        }
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

            return await externalApiGate.runExclusive(async () => {
                const candidates = buildCandidateModels(this.id, this.modelName);
                let lastError = '';

                for (const model of candidates) {
                    try {
                        pushLog(`↳ 嘗試模型: ${model}`, 'info');
                        const result = await client.models.generateContentStream({
                            model,
                            contents,
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

                        const response = await (result as any).response;
                        const usage = response?.usageMetadata;
                        
                        this.modelName = model;
                        return { usage };
                    } catch (err: unknown) {
                        const em = errorText(err);
                        lastError = em;
                        console.warn(`[AGENT_FALLBACK] ${this.id} model=${model} failed:`, em);
                        if (!shouldFallback(em)) throw err;
                    }
                }
                throw new Error(`All candidate models failed for agent ${this.id}: ${lastError}`);
            });
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            onChunk(`\n\n[ERROR: ${this.id}] 呼叫模型失敗：${message || 'Unknown Error'}`);
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
                    systemInstruction: systemPrompt || this.role,
                    config: {
                        safetySettings: DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });

            const txt = typeof (result as any).text === 'function' ? (result as any).text() : (result as any).text;
            return txt || "";
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
                    systemInstruction: systemPrompt || this.role,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: schema,
                        safetySettings: DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });

            const txt = typeof (result as any).text === 'function' ? (result as any).text() : (result as any).text;
            return txt ? JSON.parse(txt) : null;
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
