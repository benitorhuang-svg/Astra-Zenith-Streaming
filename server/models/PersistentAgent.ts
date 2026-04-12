import { type Tool } from '@google/genai';
import { getAstraClient } from '../core/client';
import { pushLog } from '../services/LogService';
import { getAgentConfig, DEFAULT_SAFETY_SETTINGS, isPaidTier } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';
import { telemetryService } from '../services/TelemetryService';
import { StreamMessage } from './AgentTypes';
import { errorText, shouldFallback, isRetryable, extractStatusCode } from './AgentUtils';
import { ContentConverter } from './ContentConverter';
import { ModelCoordinator } from './ModelCoordinator';

/**
 * 🚀 PERSISTENT_AGENT_HARNESS (2026 Resilience Edition)
 */
export class PersistentAgent {
    id: string;
    name: string;
    role: string;
    modelName: string;
    tools?: Tool[];

    constructor(id: string, name: string, role: string, modelName: string, tools?: Tool[]) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.tools = tools;
        this.modelName = getAgentConfig(id)?.model || modelName || 'gemini-3.1-flash-lite-preview';
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
            const contents = ContentConverter.toGeminiContents(messages);
            if (contents.length === 0) throw new Error('EMPTY_CONTENT');
            const cachedContent = (messages as any).cachedContent;

            return await externalApiGate.runExclusive(async () => {
                const candidates = ModelCoordinator.getCandidates(this.id, overrideModel || this.modelName);
                if (candidates.length === 0) throw new Error('SYSTEM_SATURATION');

                let lastError = '';
                for (const targetModel of candidates) {
                    let retries = 0;
                    while (retries < 2) {
                        try {
                            const budget = telemetryService.checkBudget(isPaidTier);
                            if (!budget.ok) {
                                if (budget.waitMs) { await new Promise(r => setTimeout(r, budget.waitMs)); continue; }
                                else throw new Error('DAILY_LIMIT');
                            }
                            pushLog(`[HARNESS] ${this.id} -> ${targetModel}${cachedContent ? ' (CACHE)' : ''}`, 'warn');
                            
                            const result = await client.models.generateContentStream({
                                model: targetModel, contents,
                                config: { systemInstruction: this.role, temperature: 0.4, topP: 0.95, maxOutputTokens: 8192, safetySettings: DEFAULT_SAFETY_SETTINGS, tools: this.tools, cachedContent: cachedContent || undefined }
                            });

                            let lastMetadata: any = null;
                            for await (const chunk of result) {
                                if (chunk.text) {
                                    if ((chunk as any).groundingMetadata) lastMetadata = (chunk as any).groundingMetadata;
                                    onChunk(chunk.text, lastMetadata);
                                } else {
                                    const finishReason = (chunk as any).candidates?.[0]?.finishReason;
                                    if (finishReason && finishReason !== 'STOP') onChunk(`\n\n[STREAM_INTERRUPTED: ${finishReason}]`);
                                }
                            }
                            const usage = (result as any).usageMetadata || {};
                            return { usage: { promptTokenCount: usage.promptTokenCount || 0, candidatesTokenCount: usage.candidatesTokenCount || 0, totalTokenCount: usage.totalTokenCount || 0, cachedContentTokenCount: usage.cachedContentTokenCount || 0, groundingMetadata: lastMetadata } };
                        } catch (err: unknown) {
                            lastError = errorText(err);
                            const status = extractStatusCode(lastError);
                            if (status === 429) { ModelCoordinator.setCooldown(targetModel, Math.pow(2, retries + 1) * 30000); break; }
                            if (isRetryable(lastError) && retries < 1) { retries++; await new Promise(r => setTimeout(r, Math.pow(2, retries) * 1000)); continue; }
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
        try {
            const result = await this._runWithFallback(async (model, client) => {
                return await client.models.generateContent({
                    model, contents: [{ role: 'user', parts: ContentConverter.toGeminiParts(content) }],
                    config: { systemInstruction: systemPrompt || this.role, temperature: 0.5, maxOutputTokens: 4096, safetySettings: DEFAULT_SAFETY_SETTINGS, tools: this.tools }
                });
            });
            return result.text || "";
        } catch (e) { console.error(`[Reason_Fail]`, e); return ""; }
    }

    async reasonStructured<T>(content: string | any[], schema: any): Promise<T | null> {
        try {
            const result = await this._runWithFallback(async (model, client) => {
                return await client.models.generateContent({
                    model, contents: [{ role: 'user', parts: ContentConverter.toGeminiParts(content) }],
                    config: { systemInstruction: this.role, temperature: 0.1, maxOutputTokens: 2048, responseMimeType: 'application/json', responseSchema: schema, safetySettings: DEFAULT_SAFETY_SETTINGS }
                });
            });
            return result.text ? JSON.parse(result.text) as T : null;
        } catch (e) { console.error(`[ReasonStructured_Fail]`, e); return null; }
    }

    async countTokens(content: string | StreamMessage[]): Promise<number> {
        try {
            const client = getAstraClient();
            const contents = Array.isArray(content) 
                ? content.filter(m => m.content).map(m => ({ role: 'user' as any, parts: [{ text: m.content }] })) 
                : [{ role: 'user' as any, parts: [{ text: content || "" }] }];
            if (contents.length === 0) return 0;
            const res = await client.models.countTokens({ model: this.modelName, contents });
            return res.totalTokens || 0;
        } catch { return 0; }
    }

    private async _runWithFallback<T>(operation: (model: string, client: any) => Promise<T>): Promise<T> {
        const client = getAstraClient();
        return await externalApiGate.runExclusive(async () => {
            const candidates = ModelCoordinator.getCandidates(this.id, this.modelName);
            let lastError = '';
            for (const model of candidates) {
                try { return await operation(model, client); } catch (err: unknown) {
                    lastError = errorText(err);
                    if (!shouldFallback(lastError)) throw err;
                }
            }
            throw new Error(`Fallbacks exhausted: ${lastError}`);
        });
    }
}
