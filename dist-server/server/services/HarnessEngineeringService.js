"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.harnessService = exports.HarnessEngineeringService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LogService_1 = require("./LogService");
class HarnessEngineeringService {
    activeState = null;
    harnessDir = path_1.default.join(process.cwd(), 'docs', 'harness');
    constructor() {
        if (!fs_1.default.existsSync(this.harnessDir))
            fs_1.default.mkdirSync(this.harnessDir, { recursive: true });
    }
    initializeMission(missionId, topic, initialState) {
        this.activeState = {
            missionId, topic, variables: {}, facts: [], scaffold: [],
            metrics: { agentScores: {}, totalConflicts: 0 }
        };
        if (initialState) {
            if (initialState.variables)
                this.activeState.variables = initialState.variables;
            if (initialState.facts)
                this.activeState.facts = initialState.facts;
            if (initialState.scaffold)
                this.activeState.scaffold = initialState.scaffold;
            if (initialState.metrics)
                this.activeState.metrics = initialState.metrics;
            (0, LogService_1.pushLog)(`♻️ [Harness_Rehydrate] 已從前端同步事實狀態`, 'info');
        }
        this.persistState();
        (0, LogService_1.pushLog)(`🛡️ [Harness_Kernel] 4.0 已就緒 (ID: ${missionId})`, 'success');
    }
    processOutput(agentId, content) {
        if (!this.activeState)
            return {};
        let stateChanged = false;
        // 1. Versioned Variable Extraction
        const vMatches = content.matchAll(/\[VARIABLE\]:\s*(\w+)\s*=\s*(.*)/g);
        for (const match of vMatches) {
            const [, key, val] = match;
            const value = val.trim();
            const existing = this.activeState.variables[key];
            if (existing && existing.locked && agentId !== 'A1') {
                (0, LogService_1.pushLog)(`🚫 [Harness] 阻止對鎖定變數 ${key} 的越權修改`, 'error');
                this.updateScore(agentId, -5);
                continue;
            }
            const type = isNaN(Number(value)) ? 'string' : 'number';
            const version = { value, source: agentId, timestamp: Date.now() };
            if (!existing) {
                this.activeState.variables[key] = { current: value, type, locked: agentId === 'A1', history: [version] };
                stateChanged = true;
            }
            else if (existing.current !== value) {
                existing.current = value;
                existing.history.push(version);
                (0, LogService_1.pushLog)(`⚙️ [Harness_Var] ${key} 已更新為 v${existing.history.length}`, 'info');
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
                (0, LogService_1.pushLog)(`🧠 [Fact_Anchor] 已固化 (G=${gravity})`, 'warn');
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
        if (stateChanged)
            this.persistState();
        return this.activeState;
    }
    updateScore(agentId, delta) {
        if (!this.activeState)
            return;
        this.activeState.metrics.agentScores[agentId] = (this.activeState.metrics.agentScores[agentId] || 0) + delta;
    }
    persistState() {
        if (!this.activeState)
            return;
        try {
            const filePath = path_1.default.join(this.harnessDir, `${this.activeState.missionId}.json`);
            fs_1.default.writeFileSync(filePath, JSON.stringify(this.activeState, null, 2), 'utf8');
        }
        catch (err) {
            console.error('[Harness_VFS_Err]', err);
        }
    }
    getGoverningContext() {
        if (!this.activeState)
            return '';
        const facts = this.activeState.facts.map(f => `${f.id} (G=${f.gravity}): ${f.content}`).join('\n');
        const vars = Object.entries(this.activeState.variables).map(([k, v]) => `${k}=${v.current}`).join(', ');
        const scores = Object.entries(this.activeState.metrics.agentScores).map(([k, v]) => `${k}:${v}`).join(', ');
        return `\n[HARNESS_GOVERNING_STATE_V4]:
- 固化事實集 (Facts):
${facts || '無'}
- 關鍵變數集 (Vars): ${vars || '無'}
- 協作完整性分數: ${scores || '計算中'}
- 累積衝突數: ${this.activeState.metrics.totalConflicts}
`;
    }
    verifyIntegrity(agentId, content) {
        if (!this.activeState)
            return { valid: true };
        const refMatches = content.matchAll(/\[REF:\s*(F\d+)\]/g);
        for (const match of refMatches) {
            if (!this.activeState.facts.find(f => f.id === match[1])) {
                return { valid: false, reason: `引用幻覺: ${match[1]} 不存在於內核事實庫中。` };
            }
        }
        if (agentId !== 'A1' && this.activeState.scaffold.length > 0) {
            const hasTarget = this.activeState.scaffold.some(p => content.includes(`## ${p.idCode}`));
            if (!hasTarget)
                return { valid: false, reason: '未按大綱標題填充內容 (IDCode Mismatch)' };
        }
        return content.includes('[SUMMARY]') ? { valid: true } : { valid: false, reason: '缺失 [SUMMARY] 結尾標記' };
    }
}
exports.HarnessEngineeringService = HarnessEngineeringService;
exports.harnessService = new HarnessEngineeringService();
