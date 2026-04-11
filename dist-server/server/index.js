"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const morgan_1 = __importDefault(require("morgan"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
// Atomic Core & Routes
const config_1 = require("./core/config");
const Agent_1 = require("./models/Agent");
const mission_1 = __importDefault(require("./routes/mission"));
const system_1 = __importDefault(require("./routes/system"));
const analysis_1 = __importDefault(require("./routes/analysis"));
const VectorService_1 = require("./services/VectorService");
const CoreService_1 = require("./services/CoreService");
const app = (0, express_1.default)();
app.use((0, compression_1.default)());
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
// Serve stationary UI from /public (Production)
const DIST_PATH = path_1.default.join(process.cwd(), 'dist');
if (fs_1.default.existsSync(DIST_PATH)) {
    console.log(`📦 Serving production build from: ${DIST_PATH}`);
    app.use(express_1.default.static(DIST_PATH));
}
else {
    console.warn(`⚠️ Warning: Production build directory not found at ${DIST_PATH}. Falling back to source folders.`);
    app.use(express_1.default.static('public'));
    app.use('/scripts', express_1.default.static('src/scripts'));
    app.use('/styles', express_1.default.static('src/styles'));
    app.use('/images', express_1.default.static('public/images'));
}
// Industrial Routes
app.use('/api', mission_1.default);
app.use('/api', system_1.default);
app.use('/api/analysis', analysis_1.default);
// Catch-all for SPA navigation
app.get(/.*/, (req, res, next) => {
    if (req.url.startsWith('/api'))
        return next();
    const indexPath = path_1.default.join(DIST_PATH, 'index.html');
    if (fs_1.default.existsSync(indexPath)) {
        res.sendFile(indexPath);
    }
    else {
        res.sendFile(path_1.default.join(process.cwd(), 'index.html'));
    }
});
/**
 * ==========================================
 * 🛠️ GLOBAL ERROR HANDLER
 * ==========================================
 */
app.use((0, morgan_1.default)('dev'));
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        console.log(`[DIAGNOSTIC] ${req.method} ${req.url}`);
    }
    next();
});
app.use(express_1.default.static('public'));
/**
 * ==========================================
 * 📡 API GATEWAY (ATOMIC MODULES)
 * ==========================================
 */
app.use('/api', (req, res, next) => {
    console.log(`📡 [API_GATEWAY] ${req.method} ${req.originalUrl}`);
    if (req.method === 'POST')
        console.log(`📦 Payload:`, JSON.stringify(req.body));
    next();
});
app.use('/api', system_1.default); // /api/logs, /api/auth/*
app.use('/api', mission_1.default); // /api/mission/*, /api/discussion/*, /api/chat-legacy
app.use('/api/analysis', analysis_1.default); // /api/analysis/graph, /api/analysis/inject
/**
 * ==========================================
 * 🛠️ GLOBAL ERROR HANDLER
 * ==========================================
 */
app.use((err, req, res, _next) => {
    console.error('💥 GLOBAL_ERROR:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: 'Internal Server Error', message });
});
/**
 * ==========================================
 * 🚀 SERVER STARTUP (2026 STANDARDS)
 * ==========================================
 */
// 🚀 Background Initialization (2026 Standards)
async function bootstrap() {
    (0, config_1.validateConfig)();
    console.log(`📂 Current Working Directory: ${process.cwd()}`);
    const azDir = process.cwd();
    const agentStatePath = path_1.default.join(azDir, 'server', 'core', 'AGENT_STATE.json');
    if (fs_1.default.existsSync(agentStatePath)) {
        try {
            const state = JSON.parse(fs_1.default.readFileSync(agentStatePath, 'utf8'));
            await Agent_1.pool.warmup(state.agent_pool);
            console.log(`✅ 戰術代理人池預熱完成 (${state.agent_pool.length} 節點)`);
            VectorService_1.vectorService.loadNodes();
            await (0, CoreService_1.syncMultimodalKnowledge)(VectorService_1.vectorService);
            console.log(`🧠 語義圖譜與多模態資源預熱完成`);
        }
        catch (e) {
            console.error(`❌ 基礎設施引發失敗:`, e);
        }
    }
    else {
        console.warn(`⚠️ Warning: Agent state file not found at ${agentStatePath}`);
    }
}
/**
 * ==========================================
 * 🛡️ GRACEFUL SHUTDOWN (Resource Governance)
 * ==========================================
 */
const cleanup = async () => {
    console.log('\n🛑 [AASC_Kernel] 正在啟動優雅停機程序...');
    const { contextCacheService } = await Promise.resolve().then(() => __importStar(require('./services/ContextCacheService')));
    await contextCacheService.clear();
    console.log('📦 [Cache_Service] 遠端快取已釋放。');
    process.exit(0);
};
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
app.listen(config_1.PORT, '0.0.0.0', () => {
    console.log(`🚀 Astra Zenith SDK Hub (2026 Standards) at http://0.0.0.0:${config_1.PORT}`);
    bootstrap().catch(err => console.error('💥 Bootstrap Error:', err));
});
