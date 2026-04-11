"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LogService_1 = require("../services/LogService");
const config_1 = require("../core/config");
const Agent_1 = require("../models/Agent");
const client_1 = require("../core/client");
const externalApiGate_1 = require("../core/externalApiGate");
const TelemetryService_1 = require("../services/TelemetryService");
const router = (0, express_1.Router)();
/**
 * 🛠️ IN-MEMORY AUTH REGISTRATION
 * Zero-Disk approach to prevent local leak while securing the transport layer.
 */
router.post('/auth/register', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey)
        return res.status(400).json({ error: 'Missing Key' });
    (0, config_1.setGeminiKey)(apiKey);
    (0, LogService_1.pushLog)(`🔑 API 金鑰已成功註冊至記憶體暫存區中。`, 'success');
    res.json({ status: 'SUCCESS' });
});
/**
 * SSE Logs Pipeline (Core Monitor)
 */
router.get('/logs', (req, res) => {
    (0, LogService_1.registerLogClient)(res);
    req.on('close', () => (0, LogService_1.unregisterLogClient)(res));
});
/**
 * Authentication Mode Switcher
 */
router.post('/auth/mode', async (req, res) => {
    const { mode } = req.body;
    (0, config_1.setAuthMode)(mode);
    (0, LogService_1.pushLog)(`🔄 系統連線模式切換: ${mode}...`, 'warn');
    const agentStatePath = path_1.default.join(process.cwd(), 'server', 'core', 'AGENT_STATE.json');
    if (fs_1.default.existsSync(agentStatePath)) {
        const state = JSON.parse(fs_1.default.readFileSync(agentStatePath, 'utf8'));
        await Agent_1.pool.warmup(state.agent_pool);
        res.json({ status: 'SUCCESS', mode: config_1.currentAuthMode });
    }
    else {
        res.status(500).json({ error: 'AGENT_STATE.json 核心定義遺失' });
    }
});
/**
 * Tactical System Status
 */
router.get('/auth/status', (req, res) => {
    const isApiValid = config_1.GEMINI_API_KEY.length > 10;
    res.json({ mode: config_1.currentAuthMode, api: isApiValid, cli: true });
});
/**
 * 🛰️ SYSTEM_TELEMETRY: Real-time load and performance metrics
 * Supports both modern /telemetry and legacy /system/telemetry for transition stability.
 */
router.get(['/telemetry', '/system/telemetry'], (req, res) => {
    try {
        const metrics = TelemetryService_1.telemetryService.getMetrics();
        res.json(metrics);
    }
    catch (e) {
        console.error('❌ TELEMETRY_ACCESS_FAILED:', e);
        res.status(500).json({ error: 'TELEMETRY_ENGINE_BUSY', details: String(e) });
    }
});
let identifiedTier = 'FREE';
/**
 * API Key Validation Hub
 */
router.post('/auth/verify', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey)
        return res.status(400).json({ valid: false, error: 'API Key is missing' });
    try {
        await externalApiGate_1.externalApiGate.runExclusive(async () => {
            const client = (0, client_1.getAstraClient)(apiKey);
            // 🛰️ MODEL_DISCOVERY: Search for available models to determine Tier
            const modelList = await client.models.list();
            // INDUSTRIAL DEFENSE: Handle variant SDK response structures (data, models, or raw array)
            const models = modelList.data || modelList.models || (Array.isArray(modelList) ? modelList : []);
            const modelNames = models.map((model) => model.name || "");
            const isPaid = modelNames.some((name) => /pro|ultra/i.test(name));
            // 🧠 TIER-AWARE OPTIMIZATION: Dynamically upgrade AGENT_OS_CONFIG
            await (0, config_1.optimizeTierModels)(isPaid);
            Agent_1.pool.refreshTierModels(); // Apply to live agents
            (0, config_1.setGeminiKey)(apiKey);
            identifiedTier = isPaid ? 'PAID' : 'FREE';
        });
        (0, LogService_1.pushLog)(`✅ API Key 驗證通過 (${identifiedTier === 'PAID' ? '💎 付費級' : '🆓 免費級'})。系統已自動配置最佳模型陣容。`, 'success');
        res.json({ valid: true, tier: identifiedTier });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        (0, LogService_1.pushLog)(`❌ API Key 驗證失敗: ${message}`, 'error');
        res.status(401).json({ valid: false, error: message });
    }
});
/**
 * 🛰️ MODEL_ROUTING_HUB: Fetch available models per Tier
 */
router.get('/auth/models', (req, res) => {
    const isPaid = identifiedTier === 'PAID';
    // Precise Billable Lineup (Verified via Pricing Portal 2026-04-09)
    const freeModels = [
        'gemini-3.1-flash-lite-preview',
        'gemini-3-flash-preview',
        'gemini-2.5-flash-lite',
        'gemini-2.5-flash',
        'gemini-robotics-er-1.5-preview',
        'gemma-2-27b-it', // Legacy support
        'gemma-4-it' // Newest Lightweight Open Model
    ];
    const paidModels = [
        ...freeModels,
        'gemini-3.1-pro-preview',
        'gemini-2.5-pro'
    ];
    res.json({
        available: isPaid ? paidModels : freeModels,
        current: Object.entries(config_1.AGENT_OS_CONFIG).map(([id, cfg]) => ({
            id,
            model: cfg.model,
            role: cfg.role
        }))
    });
});
/**
 * 🛠️ CONFIG_OVERRIDE: Push custom agent-model mapping
 */
router.post('/auth/config', (req, res) => {
    const { mapping } = req.body; // Expecting { A1: 'model-name', ... }
    // AGENT_OS_CONFIG is imported at module level (ESM-safe)
    if (!mapping)
        return res.status(400).json({ error: 'Missing mapping' });
    Object.entries(mapping).forEach(([agentId, modelName]) => {
        if (config_1.AGENT_OS_CONFIG[agentId]) {
            config_1.AGENT_OS_CONFIG[agentId].model = modelName;
        }
    });
    (0, LogService_1.pushLog)(`⚙️ 戰術模型分配已手動更新。`, 'info');
    res.json({ status: 'SUCCESS', config: config_1.AGENT_OS_CONFIG });
});
exports.default = router;
