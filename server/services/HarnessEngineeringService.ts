import fs from 'fs';
import path from 'path';
import { pushLog } from './LogService';

/**
 * HARNESS ENGINEERING SERVICE (HES) v4.0 - Industrial Grade Truth Kernel
 * Features: Variable Versioning, Conflict Gravity, Collaboration Scoring.
 */
export interface FactEntry {
    id: string;
    content: string;
    sourceAgent: string;
    timestamp: number;
    gravity: number; // 1-10, A1 = 10
}

export interface VariableVersion {
    value: string;
    source: string;
    timestamp: number;
}

export interface HarnessState {
    missionId: string;
    topic: string;
    variables: Record<string, { 
        current: string; 
        type: string; 
        locked: boolean; 
        history: VariableVersion[];
    }>;
    facts: FactEntry[];
    scaffold: { idCode: string; title: string; status: string; owner?: string }[];
    metrics: {
        agentScores: Record<string, number>;
        totalConflicts: number;
    };
}

export class HarnessEngineeringService {
    private activeState: HarnessState | null = null;
    private readonly harnessDir = path.join(process.cwd(), 'docs', 'harness');

    constructor() {
        if (!fs.existsSync(this.harnessDir)) fs.mkdirSync(this.harnessDir, { recursive: true });
    }

    public initializeMission(missionId: string, topic: string, initialState?: any) {
        this.activeState = { 
            missionId, topic, variables: {}, facts: [], scaffold: [],
            metrics: { agentScores: {}, totalConflicts: 0 }
        };

        if (initialState) {
            if (initialState.variables) this.activeState.variables = initialState.variables;
            if (initialState.facts) this.activeState.facts = initialState.facts;
            if (initialState.scaffold) this.activeState.scaffold = initialState.scaffold;
            if (initialState.metrics) this.activeState.metrics = initialState.metrics;
            pushLog(`♻️ [Harness_Rehydrate] 已從前端同步事實狀態`, 'info');
        }

        this.persistState();
        pushLog(`🛡️ [Harness_Kernel] 4.0 已就緒 (ID: ${missionId})`, 'success');
    }

    public processOutput(agentId: string, content: string): Partial<HarnessState> {
        if (!this.activeState) return {};
        let stateChanged = false;

        // 1. Versioned Variable Extraction
        const vMatches = content.matchAll(/\[VARIABLE\]:\s*(\w+)\s*=\s*(.*)/g);
        for (const match of vMatches) {
            const [ , key, val ] = match;
            const value = val.trim();
            const existing = this.activeState.variables[key];

            if (existing && existing.locked && agentId !== 'A1') {
                pushLog(`🚫 [Harness] 阻止對鎖定變數 ${key} 的越權修改`, 'error');
                this.updateScore(agentId, -5);
                continue;
            }

            const type = isNaN(Number(value)) ? 'string' : 'number';
            const version: VariableVersion = { value, source: agentId, timestamp: Date.now() };

            if (!existing) {
                this.activeState.variables[key] = { current: value, type, locked: agentId === 'A1', history: [version] };
                stateChanged = true;
            } else if (existing.current !== value) {
                existing.current = value;
                existing.history.push(version);
                pushLog(`⚙️ [Harness_Var] ${key} 已更新為 v${existing.history.length}`, 'info');
                stateChanged = true;
            }
            this.updateScore(agentId, 2);
        }

        // 2. High-Gravity Fact Extraction
        const fMatches = content.matchAll(/\[FACT\]:\s*(.*)/g);
        for (const match of fMatches) {
            const factContent = match[1].trim();
            if (!this.activeState.facts.find(f => f.content === factContent)) {
                const gravity = agentId === 'A1' ? 10 : 5;
                this.activeState.facts.push({
                    id: `F${this.activeState.facts.length + 1}`,
                    content: factContent,
                    sourceAgent: agentId,
                    timestamp: Date.now(),
                    gravity
                });
                pushLog(`🧠 [Fact_Anchor] 已固化 (G=${gravity})`, 'warn');
                stateChanged = true;
                this.updateScore(agentId, 5);
            }
        }

        // 3. Conflict Monitoring
        if (content.includes('[CONFLICT_ALERT]')) {
            this.activeState.metrics.totalConflicts++;
            this.updateScore(agentId, 3); // Positive score for reporting conflict
            stateChanged = true;
        }

        // 4. Scaffold Tracking
        if (agentId === 'A1' && this.activeState.scaffold.length === 0) {
            const mapMatch = content.match(/\[STRATEGIC_MAP\]\n([\s\S]*?)(?=\n\n|##|$)/);
            if (mapMatch) {
                const lines = mapMatch[1].split('\n').filter(l => l.includes('|'));
                this.activeState.scaffold = lines.map(line => {
                    const parts = line.split('|').map(s => s.trim());
                    return { idCode: parts[0].replace('-', '').trim(), title: parts[1], status: 'PENDING' };
                });
                stateChanged = true;
            }
        }

        this.activeState.scaffold.forEach(point => {
            if (content.includes(`## ${point.idCode}`) && point.status !== 'COMPLETED') {
                point.status = 'COMPLETED';
                point.owner = agentId;
                stateChanged = true;
                this.updateScore(agentId, 10);
            }
        });

        if (stateChanged) this.persistState();
        return this.activeState;
    }

    private updateScore(agentId: string, delta: number) {
        if (!this.activeState) return;
        this.activeState.metrics.agentScores[agentId] = (this.activeState.metrics.agentScores[agentId] || 0) + delta;
    }

    private persistState() {
        if (!this.activeState) return;
        try {
            const filePath = path.join(this.harnessDir, `${this.activeState.missionId}.json`);
            fs.writeFileSync(filePath, JSON.stringify(this.activeState, null, 2), 'utf8');
        } catch (err) { console.error('[Harness_VFS_Err]', err); }
    }

    public getGoverningContext(): string {
        if (!this.activeState) return '';
        const facts = this.activeState.facts.map(f => `${f.id} (G=${f.gravity}): ${f.content}`).join('\n');
        const vars = Object.entries(this.activeState.variables).map(([k,v]) => `${k}=${v.current}`).join(', ');
        const scores = Object.entries(this.activeState.metrics.agentScores).map(([k,v]) => `${k}:${v}`).join(', ');

        return `\n[HARNESS_GOVERNING_STATE_V4]:
- 固化事實集 (Facts):
${facts || '無'}
- 關鍵變數集 (Vars): ${vars || '無'}
- 協作完整性分數: ${scores || '計算中'}
- 累積衝突數: ${this.activeState.metrics.totalConflicts}
`;
    }

    public verifyIntegrity(agentId: string, content: string): { valid: boolean; reason?: string } {
        if (!this.activeState) return { valid: true };

        const refMatches = content.matchAll(/\[REF:\s*(F\d+)\]/g);
        for (const match of refMatches) {
            if (!this.activeState.facts.find(f => f.id === match[1])) {
                return { valid: false, reason: `引用幻覺: ${match[1]} 不存在於內核事實庫中。` };
            }
        }

        if (agentId !== 'A1' && this.activeState.scaffold.length > 0) {
            const hasTarget = this.activeState.scaffold.some(p => content.includes(`## ${p.idCode}`));
            if (!hasTarget) return { valid: false, reason: '未按大綱標題填充內容 (IDCode Mismatch)' };
        }
        
        return content.includes('[SUMMARY]') ? { valid: true } : { valid: false, reason: '缺失 [SUMMARY] 結尾標記' };
    }
}

export const harnessService = new HarnessEngineeringService();
