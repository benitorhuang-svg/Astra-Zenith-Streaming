import { pushLog } from '../services/LogService';
import { buildCandidateModels } from './AgentUtils';

/**
 * ModelCoordinator — Orchestrates model candidates selection and cooldowns
 */
export class ModelCoordinator {
    private static cooldowns: Record<string, number> = {};

    public static getCandidates(agentId: string, model: string): string[] {
        const rawCandidates = buildCandidateModels(agentId, model);
        return rawCandidates.filter(m => (this.cooldowns[m] || 0) < Date.now());
    }

    public static setCooldown(model: string, ms: number) {
        this.cooldowns[model] = Date.now() + ms;
        pushLog(`🚫 [${model}] 鎖定中: ${ms/1000}s`, 'error');
    }
}
