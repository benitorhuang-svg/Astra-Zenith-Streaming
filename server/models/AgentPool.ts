import path from 'path';
import fs from 'fs';
import { pushLog } from '../services/LogService';
import { AgentPoolEntry, StreamMessage } from './AgentTypes';
import { PersistentAgent } from './PersistentAgent';

/**
 * 🛰️ AGENT_OS_POOL_MANAGER (The Orchestrator)
 */
export class AgentPoolManager {
    agents: Map<string, PersistentAgent> = new Map();

    async warmup(config: AgentPoolEntry[]) {
        pushLog('🛰️ [Agent_OS] 正在重建 6-Agent 協作網路 (2026 Unified SDK)...', 'info');
        this.agents.clear();
        
        for (const a of config) {
            let role = a.role || "You are a helpful industrial agent.";
            if (a.prompt_ref) {
                const promptPath = path.join(process.cwd(), a.prompt_ref);
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

    /**
     * Force refresh all agents to match current Tier-Aware config
     */
    refreshTierModels() {
        this.agents.forEach(agent => agent.updateModel());
        pushLog('💎 [Agent_OS] 戰術模型矩陣已根據當前 Tier 自動同步', 'success');
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

    async sendMessage(id: string, messages: StreamMessage[], onChunk: (chunk: string) => void, apiKey?: string, cachedContent?: string, overrideModel?: string) {
        const agent = this.agents.get(id);
        if (!agent) throw new Error(`代理 ${id} 未掛載`);
        if (cachedContent) (messages as any).cachedContent = cachedContent;
        return await agent.streamMessage(messages, onChunk, apiKey, overrideModel);
    }
}

export const pool = new AgentPoolManager();
