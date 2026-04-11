"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = exports.AgentPoolManager = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const LogService_1 = require("../services/LogService");
const PersistentAgent_1 = require("./PersistentAgent");
/**
 * 🛰️ AGENT_OS_POOL_MANAGER (The Orchestrator)
 */
class AgentPoolManager {
    agents = new Map();
    async warmup(config) {
        (0, LogService_1.pushLog)('🛰️ [Agent_OS] 正在重建 6-Agent 協作網路 (2026 Unified SDK)...', 'info');
        this.agents.clear();
        for (const a of config) {
            let role = a.role || "You are a helpful industrial agent.";
            if (a.prompt_ref) {
                const promptPath = path_1.default.join(process.cwd(), a.prompt_ref);
                if (fs_1.default.existsSync(promptPath)) {
                    role = fs_1.default.readFileSync(promptPath, 'utf8');
                }
            }
            // Phase 3: Wisdom Enrichment (Gemini Cookbook Tools)
            let tools = undefined;
            if (a.id === 'A3') {
                // 🚀 DYNAMIC_GROUNDING (2026 Unified SDK Standard)
                // Use MODE_DYNAMIC to let the model decide when search is needed
                tools = [{
                        googleSearchRetrieval: {
                            dynamicRetrievalConfig: {
                                mode: 'MODE_DYNAMIC',
                                dynamicThreshold: 0.3 // 🚀 Optimized for factual sensitivity
                            }
                        }
                    }];
            }
            const agent = new PersistentAgent_1.PersistentAgent(a.id, a.name, role, a.model, tools);
            this.agents.set(a.id, agent);
            (0, LogService_1.pushLog)(`✅ [${a.id}] ${a.name} (${agent.modelName}) 已就緒`, 'success');
        }
    }
    /**
     * Force refresh all agents to match current Tier-Aware config
     */
    refreshTierModels() {
        this.agents.forEach(agent => agent.updateModel());
        (0, LogService_1.pushLog)('💎 [Agent_OS] 戰術模型矩陣已根據當前 Tier 自動同步', 'success');
    }
    getAgent(id) { return this.agents.get(id); }
    async routeIntent(topic) {
        const router = this.getAgent('A1');
        if (!router)
            return { allowed: true, reason: '', sddModifier: '' };
        const intentSchema = {
            type: 'OBJECT',
            properties: {
                allowed: { type: 'BOOLEAN', description: '是否允許技術請求' },
                reason: { type: 'STRING', description: '拒絕原因或意圖簡述' },
                sddModifier: { type: 'STRING', description: 'SDD規格修飾符（若為技術請求）' }
            },
            required: ['allowed', 'reason', 'sddModifier']
        };
        const result = await router.reasonStructured(`分析用戶意圖： "${topic}"。判斷此為閒聊(拒絕)或技術請求(核准)。`, intentSchema);
        return result || { allowed: true, reason: 'Fallback to permissive mode', sddModifier: '' };
    }
    async validateOutput(content) {
        const guard = this.getAgent('A6');
        if (!guard)
            return content;
        const check = await guard.reason(`檢查內容安全性：\n\n${content.slice(0, 1000)}`);
        return check || content;
    }
    async sendMessage(id, messages, onChunk, apiKey, cachedContent, overrideModel) {
        const agent = this.agents.get(id);
        if (!agent)
            throw new Error(`代理 ${id} 未掛載`);
        if (cachedContent)
            messages.cachedContent = cachedContent;
        return await agent.streamMessage(messages, onChunk, apiKey, overrideModel);
    }
}
exports.AgentPoolManager = AgentPoolManager;
exports.pool = new AgentPoolManager();
