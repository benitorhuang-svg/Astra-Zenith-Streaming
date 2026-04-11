"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_AGENT_SEQUENCE = exports.AGENT_POOL = void 0;
exports.getAgentByCode = getAgentByCode;
exports.getAgentLabel = getAgentLabel;
exports.createAgentPath = createAgentPath;
exports.buildAgentEvent = buildAgentEvent;
exports.getAgentStatusTone = getAgentStatusTone;
const types_1 = require("./types");
exports.AGENT_POOL = [
    {
        code: 'A1',
        name: 'COMMANDER (A1)',
        status: 'NORMAL',
        img: 'agent_a1.png',
        desc: '人格特質：好奇心極強、數據敏感。負責同步徵兆及大規模深度檢索作業。',
        color: '#00f7ff' // Atomic Cyan
    },
    {
        code: 'A2',
        name: 'STRATEGIST (A2)',
        status: 'NORMAL',
        img: 'agent_a2.png',
        desc: '人格特質：嚴謹、邏輯分明。專門執行模式識別與系統性異常比對策略。',
        color: '#ff0055' // Critical Magenta
    },
    {
        code: 'A3',
        name: 'ANALYST (A3)',
        status: 'NORMAL',
        img: 'agent_a3.png',
        desc: '人格特質：警覺性高。負責監控邊緣數據動態與即時環境感知回饋。',
        color: '#aaff00' // Lime Pulse
    },
    {
        code: 'A4',
        name: 'RESEARCHER (A4)',
        status: 'NORMAL',
        img: 'agent_a4.png',
        desc: '人格特質：系統化思考者。主要負責網絡結構重組與封包流向模擬。',
        color: '#ffaa00' // Warning Orange
    },
    {
        code: 'A5',
        name: 'CRITIC (A5)',
        status: 'NORMAL',
        img: 'agent_a5.png',
        desc: '人格特質：果斷。執行阻斷策略與系統性衝突自動化排除協議。',
        color: '#aa00ff' // Neural Purple
    },
    {
        code: 'A6',
        name: 'CONVERGER (A6)',
        status: 'NORMAL',
        img: 'agent_a6.png',
        desc: '人格特質：直覺型分析。輔助系統決策判斷並預估多重變量下的風險概率。',
        color: '#00ffaa' // Success Green
    }
];
exports.DEFAULT_AGENT_SEQUENCE = exports.AGENT_POOL.map(agent => agent.code);
function getAgentByCode(code) {
    return exports.AGENT_POOL.find(agent => agent.code === code);
}
function getAgentLabel(code) {
    return getAgentByCode(code)?.name ?? code;
}
function createAgentPath(...segments) {
    return (0, types_1.normalizeAgentPath)(segments);
}
function buildAgentEvent(type, payload, path, options = {}) {
    return (0, types_1.createAgentEvent)(type, payload, path, options);
}
function getAgentStatusTone(status) {
    const map = {
        NORMAL: 'text-primary',
        WARNING: 'text-warning',
        OFFLINE: 'text-error',
        ACTIVE: 'text-primary',
        RUNNING: 'text-primary',
        IDLE: 'text-white/40',
        SUCCESS: 'text-success',
        WAIT: 'text-warning',
        BUSY: 'text-primary',
        ERROR: 'text-error'
    };
    return map[status];
}
