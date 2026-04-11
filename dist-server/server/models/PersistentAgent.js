"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersistentAgent = void 0;
const client_1 = require("../core/client");
const LogService_1 = require("../services/LogService");
const config_1 = require("../core/config");
const externalApiGate_1 = require("../core/externalApiGate");
const TelemetryService_1 = require("../services/TelemetryService");
const AgentUtils_1 = require("./AgentUtils");
// 🚀 SHARED_COOLDOWN_MAP
const modelCooldowns = {};
/**
 * 🚀 PERSISTENT_AGENT_HARNESS (2026 Resilience Edition)
 */
class PersistentAgent {
    id;
    name;
    role;
    modelName;
    tools; // 🚀 Typed Tools
    constructor(id, name, role, modelName, tools) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.tools = tools;
        const targetModel = (0, config_1.getAgentConfig)(id)?.model;
        this.modelName = targetModel || modelName || 'gemini-3.1-flash-lite-preview';
    }
    updateModel() {
        const targetModel = (0, config_1.getAgentConfig)(this.id)?.model;
        if (targetModel) {
            this.modelName = targetModel;
            (0, LogService_1.pushLog)(`🔄 [${this.id}] 模型同步: ${this.modelName}`, 'info');
        }
    }
    async streamMessage(messages, onChunk, apiKey, overrideModel) {
        try {
            const client = (0, client_1.getAstraClient)(apiKey);
            // 🚀 UNIFIED_CONTENT_CONVERTER
            const contents = messages
                .filter(m => (m.content && m.content.trim() !== '') || (m.parts && m.parts.length > 0))
                .map(m => {
                let role = (m.role || 'user').toLowerCase();
                if (role === 'assistant' || role === 'bot' || role === 'model')
                    role = 'model';
                else
                    role = 'user';
                const parts = m.parts || [{ text: m.content || "" }];
                return { role, parts };
            });
            if (contents.length === 0)
                throw new Error('EMPTY_CONTENT');
            const cachedContent = messages.cachedContent;
            return await externalApiGate_1.externalApiGate.runExclusive(async () => {
                const model = overrideModel || this.modelName;
                const rawCandidates = (0, AgentUtils_1.buildCandidateModels)(this.id, model);
                const candidates = rawCandidates.filter(m => (modelCooldowns[m] || 0) < Date.now());
                if (candidates.length === 0)
                    throw new Error('SYSTEM_SATURATION');
                let lastError = '';
                for (const targetModel of candidates) {
                    let retries = 0;
                    const maxRetries = 2;
                    while (retries < maxRetries) {
                        try {
                            const budget = TelemetryService_1.telemetryService.checkBudget(config_1.isPaidTier);
                            if (!budget.ok) {
                                if (budget.waitMs)
                                    await new Promise(r => setTimeout(r, budget.waitMs));
                                else
                                    throw new Error('DAILY_LIMIT');
                            }
                            (0, LogService_1.pushLog)(`[HARNESS] ${this.id} 呼叫: ${targetModel}${cachedContent ? ' (CACHE_HIT)' : ''}`, 'warn');
                            const result = await client.models.generateContentStream({
                                model: targetModel,
                                contents,
                                config: {
                                    systemInstruction: this.role,
                                    temperature: 0.4,
                                    topP: 0.95,
                                    maxOutputTokens: 8192,
                                    safetySettings: config_1.DEFAULT_SAFETY_SETTINGS,
                                    tools: this.tools,
                                    cachedContent: cachedContent || undefined
                                }
                            });
                            let lastMetadata = null;
                            for await (const chunk of result) {
                                if (chunk.text) {
                                    // 🚀 GROUNDING_METADATA_AWARE
                                    const metadata = chunk.groundingMetadata;
                                    if (metadata)
                                        lastMetadata = metadata;
                                    onChunk(chunk.text, metadata);
                                }
                                else {
                                    // 🛡️ FINISH_REASON_ANALYSIS (V2 SDK Standard)
                                    const finishReason = chunk.candidates?.[0]?.finishReason;
                                    if (finishReason && finishReason !== 'STOP') {
                                        (0, LogService_1.pushLog)(`⚠️ [${this.id}] 串流中斷原因: ${finishReason}`, 'error');
                                        onChunk(`\n\n[STREAM_INTERRUPTED: ${finishReason}]`);
                                    }
                                }
                            }
                            const finalUsage = result.usageMetadata || {};
                            return {
                                usage: {
                                    promptTokenCount: finalUsage.promptTokenCount || 0,
                                    candidatesTokenCount: finalUsage.candidatesTokenCount || 0,
                                    totalTokenCount: finalUsage.totalTokenCount || 0,
                                    cachedContentTokenCount: finalUsage.cachedContentTokenCount || 0,
                                    groundingMetadata: lastMetadata // 🚀 Pass back for telemetry
                                }
                            };
                        }
                        catch (err) {
                            lastError = (0, AgentUtils_1.errorText)(err);
                            const status = (0, AgentUtils_1.extractStatusCode)(lastError);
                            if (status === 429) {
                                const backoff = Math.pow(2, retries + 1) * 30000;
                                modelCooldowns[targetModel] = Date.now() + backoff;
                                (0, LogService_1.pushLog)(`🚫 [${targetModel}] 配額耗盡，退避鎖定 ${backoff / 1000}s`, 'error');
                                break;
                            }
                            if ((0, AgentUtils_1.isRetryable)(lastError) && retries < maxRetries - 1) {
                                retries++;
                                const delay = Math.pow(2, retries) * 1000 + (Math.random() * 1000);
                                (0, LogService_1.pushLog)(`⚠️ [Retry] ${targetModel} (${status}) 重試中...`, 'warn');
                                await new Promise(r => setTimeout(r, delay));
                                continue;
                            }
                            if (!(0, AgentUtils_1.shouldFallback)(lastError))
                                throw err;
                            break;
                        }
                    }
                }
                throw new Error(`Fallbacks exhausted: ${lastError}`);
            });
        }
        catch (e) {
            onChunk(`\n\n[SYSTEM_RECOVERY_FAILURE]: ${(0, AgentUtils_1.errorText)(e)}`);
            return {};
        }
    }
    async reason(content, systemPrompt) {
        if (!content || (typeof content === 'string' && content.trim() === ''))
            return "";
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
                        safetySettings: config_1.DEFAULT_SAFETY_SETTINGS,
                        tools: this.tools
                    }
                });
            });
            return result.text || "";
        }
        catch (e) {
            console.error(`[Reason_Fail]`, e);
            return "";
        }
    }
    async reasonStructured(content, schema) {
        if (!content || (typeof content === 'string' && content.trim() === ''))
            return null;
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
                        safetySettings: config_1.DEFAULT_SAFETY_SETTINGS
                    }
                });
            });
            const text = result.text;
            if (!text)
                return null;
            return JSON.parse(text);
        }
        catch (e) {
            console.error(`[ReasonStructured_Fail]`, e);
            return null;
        }
    }
    async countTokens(content) {
        try {
            const client = (0, client_1.getAstraClient)();
            // 🚀 TOKEN_ENGINE: Using the official Unified SDK countTokens API
            // Note: Local Tokenizer is available via @google/genai/tokenizer 
            // but for full multimodal accuracy, the API call is preferred in 2026.
            const contents = Array.isArray(content)
                ? content.filter(m => m.content).map(m => ({ role: 'user', parts: [{ text: m.content }] }))
                : [{ role: 'user', parts: [{ text: content || "" }] }];
            if (contents.length === 0)
                return 0;
            const countResult = await client.models.countTokens({ model: this.modelName, contents });
            return countResult.totalTokens || 0;
        }
        catch {
            return 0;
        }
    }
    async _runWithFallback(operation) {
        const client = (0, client_1.getAstraClient)();
        return await externalApiGate_1.externalApiGate.runExclusive(async () => {
            const candidates = (0, AgentUtils_1.buildCandidateModels)(this.id, this.modelName).filter(m => (modelCooldowns[m] || 0) < Date.now());
            let lastError = '';
            for (const model of candidates) {
                try {
                    const result = await operation(model, client);
                    return result;
                }
                catch (err) {
                    lastError = (0, AgentUtils_1.errorText)(err);
                    if (!(0, AgentUtils_1.shouldFallback)(lastError))
                        throw err;
                    continue;
                }
            }
            throw new Error(`Fallbacks exhausted: ${lastError}`);
        });
    }
}
exports.PersistentAgent = PersistentAgent;
