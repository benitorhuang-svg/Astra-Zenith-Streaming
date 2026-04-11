import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { pushLog, registerLogClient, unregisterLogClient } from '../services/LogService';
import { currentAuthMode, setAuthMode, GEMINI_API_KEY, setGeminiKey, optimizeTierModels, AGENT_OS_CONFIG } from '../core/config';
import { pool } from '../models/Agent';
import { getAstraClient } from '../core/client';
import { externalApiGate } from '../core/externalApiGate';
import { telemetryService } from '../services/TelemetryService';

const router = Router();

/**
 * 🛠️ IN-MEMORY AUTH REGISTRATION
 * Zero-Disk approach to prevent local leak while securing the transport layer.
 */
router.post('/auth/register', (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ error: 'Missing Key' });
    setGeminiKey(apiKey);
    pushLog(`🔑 API 金鑰已成功註冊至記憶體暫存區中。`, 'success');
    res.json({ status: 'SUCCESS' });
});

/**
 * SSE Logs Pipeline (Core Monitor)
 */
router.get('/logs', (req, res) => {
    registerLogClient(res);
    req.on('close', () => unregisterLogClient(res));
});

/**
 * Authentication Mode Switcher
 */
router.post('/auth/mode', async (req, res) => {
    const { mode } = req.body;
    setAuthMode(mode);
    pushLog(`🔄 系統連線模式切換: ${mode}...`, 'warn');
    const agentStatePath = path.join(process.cwd(), 'server', 'core', 'AGENT_STATE.json');
    if (fs.existsSync(agentStatePath)) {
        const state = JSON.parse(fs.readFileSync(agentStatePath, 'utf8'));
        await pool.warmup(state.agent_pool);
        res.json({ status: 'SUCCESS', mode: currentAuthMode });
    } else {
        res.status(500).json({ error: 'AGENT_STATE.json 核心定義遺失' });
    }
});

/**
 * Tactical System Status
 */
router.get('/auth/status', (req, res) => {
    const isApiValid = GEMINI_API_KEY.length > 10;
    res.json({ mode: currentAuthMode, api: isApiValid, cli: true });
});

/**
 * 🛰️ SYSTEM_TELEMETRY: Real-time load and performance metrics
 * Supports both modern /telemetry and legacy /system/telemetry for transition stability.
 */
router.get(['/telemetry', '/system/telemetry'], (req, res) => {
    try {
        const metrics = telemetryService.getMetrics();
        res.json(metrics);
    } catch (e) {
        console.error('❌ TELEMETRY_ACCESS_FAILED:', e);
        res.status(500).json({ error: 'TELEMETRY_ENGINE_BUSY', details: String(e) });
    }
});

let identifiedTier: 'FREE' | 'PAID' = 'FREE';

/**
 * API Key Validation Hub
 */
router.post('/auth/verify', async (req, res) => {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ valid: false, error: 'API Key is missing' });
    
    try {
        await externalApiGate.runExclusive(async () => {
            const client = getAstraClient(apiKey);

            // 🛰️ MODEL_DISCOVERY: Search for available models to determine Tier
            const modelList = await client.models.list();
            const modelNames = (modelList as any).data.map((model: any) => model.name || "");
            const isPaid = modelNames.some(name => /pro|ultra/i.test(name));

            // 🧠 TIER-AWARE OPTIMIZATION: Dynamically upgrade AGENT_OS_CONFIG
            await optimizeTierModels(isPaid);
            pool.refreshTierModels(); // Apply to live agents

            setGeminiKey(apiKey);
            identifiedTier = isPaid ? 'PAID' : 'FREE';
        });

        pushLog(`✅ API Key 驗證通過 (${identifiedTier === 'PAID' ? '💎 付費級' : '🆓 免費級'})。系統已自動配置最佳模型陣容。`, 'success');
        res.json({ valid: true, tier: identifiedTier });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        pushLog(`❌ API Key 驗證失敗: ${message}`, 'error');
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
        current: Object.entries(AGENT_OS_CONFIG).map(([id, cfg]) => ({ 
            id, 
            model: (cfg as any).model, 
            role: (cfg as any).role 
        }))
    });
});

/**
 * 🛠️ CONFIG_OVERRIDE: Push custom agent-model mapping
 */
router.post('/auth/config', (req, res) => {
    const { mapping } = req.body; // Expecting { A1: 'model-name', ... }
    // AGENT_OS_CONFIG is imported at module level (ESM-safe)
    
    if (!mapping) return res.status(400).json({ error: 'Missing mapping' });

    Object.entries(mapping).forEach(([agentId, modelName]) => {
        if (AGENT_OS_CONFIG[agentId]) {
            AGENT_OS_CONFIG[agentId].model = modelName;
        }
    });

    pushLog(`⚙️ 戰術模型分配已手動更新。`, 'info');
    res.json({ status: 'SUCCESS', config: AGENT_OS_CONFIG });
});

export default router;
