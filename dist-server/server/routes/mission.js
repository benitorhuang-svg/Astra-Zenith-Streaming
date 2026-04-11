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
const express_1 = require("express");
const zod_1 = require("zod");
const LogService_1 = require("../services/LogService");
const Agent_1 = require("../models/Agent");
const config_1 = require("../core/config");
const MissionService_1 = require("../services/MissionService");
const ImageService_1 = require("../services/ImageService");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const HarnessEngineeringService_1 = require("../services/HarnessEngineeringService");
const router = (0, express_1.Router)();
// Validation Schema
const MissionSchema = zod_1.z.object({
    topic: zod_1.z.string().min(2),
    agents: zod_1.z.string().optional(),
    rounds: zod_1.z.string().or(zod_1.z.number()).optional().transform(v => parseInt(v) || 1),
    apiKey: zod_1.z.string().optional()
});
/**
 * Mission Initiation
 */
const initiateHandler = async (req, res) => {
    try {
        const body = (req.body ?? {});
        const { topic, agent_sequence, apiKey, missionId, harnessState } = body;
        if (!topic)
            throw new Error('topic is missing');
        if (!agent_sequence || !Array.isArray(agent_sequence))
            throw new Error('agent_sequence is missing or not an array');
        const finalMissionId = missionId || `mission-${Date.now()}`;
        HarnessEngineeringService_1.harnessService.initializeMission(finalMissionId, topic, harnessState);
        if (apiKey) {
            (0, config_1.setGeminiKey)(apiKey);
            (0, LogService_1.pushLog)(`🔗 偵測到會話金鑰，後端記憶體已重新同步。`, 'success');
        }
        const agentStatePath = path_1.default.join(process.cwd(), 'server', 'core', 'AGENT_STATE.json');
        if (fs_1.default.existsSync(agentStatePath)) {
            const state = JSON.parse(fs_1.default.readFileSync(agentStatePath, 'utf8'));
            await Agent_1.pool.warmup(state.agent_pool);
            (0, LogService_1.pushLog)(`⚙️ 任務配置同步 (ID: ${finalMissionId})`, 'info');
        }
        (0, LogService_1.pushLog)(`🎯 任務啟動："${topic}"`, 'warn');
        res.json({ status: 'SUCCESS', topic, missionId: finalMissionId });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
};
router.post('/initiate', initiateHandler);
router.post('/mission/initiate', initiateHandler);
/**
 * Image Generation (Harness Fact-Aware)
 */
router.post('/generate-image', async (req, res) => {
    try {
        const { prompt, apiKey, harnessState } = (req.body ?? {});
        if (!prompt)
            return res.status(400).json({ error: 'Prompt is required' });
        // 🚀 FACT_AWARE_IMAGE_PROMPT: Augment the prompt with consolidated facts from Harness
        let augmentedPrompt = prompt;
        if (harnessState && harnessState.facts && harnessState.facts.length > 0) {
            const factSummary = harnessState.facts.map((f) => f.content).join(', ');
            augmentedPrompt = `[TACTICAL_CONTEXT: ${factSummary}]\n\n${prompt}`;
        }
        const base64Image = await ImageService_1.imageService.generateImage(augmentedPrompt, apiKey);
        res.json({ status: 'SUCCESS', image: base64Image });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * Plain Text Discovery Stream
 */
router.post('/generate-stream', async (req, res) => {
    const { messages, agentId, apiKey, model } = (req.body ?? {});
    const id = agentId || 'A1';
    const effectiveKey = apiKey || config_1.GEMINI_API_KEY;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
    }
    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof res.flushHeaders === 'function')
            res.flushHeaders();
        res.write('\n');
        let fullContent = "";
        await Agent_1.pool.sendMessage(id, messages, (chunk) => {
            fullContent += chunk;
            res.write(String(chunk));
        }, effectiveKey, undefined, model);
        // 💾 AUTO-ARCHIVE INDIVIDUAL CHAT (2026 Standards)
        const { driveService } = await Promise.resolve().then(() => __importStar(require('../services/DriveService')));
        const { GOOGLE_DRIVE_FOLDER_ID } = await Promise.resolve().then(() => __importStar(require('../core/config')));
        if (GOOGLE_DRIVE_FOLDER_ID) {
            const fileName = `Chat_${id}_${new Date().toISOString().replace(/[:.]/g, '-')}.md`;
            const logContent = `## Agent: ${id}\n### User Input:\n${messages[messages.length - 1].content}\n\n### Agent Response:\n${fullContent}`;
            driveService.uploadFile(fileName, logContent, GOOGLE_DRIVE_FOLDER_ID).catch(e => console.error(e));
        }
        res.end();
    }
    catch (error) {
        if (!res.headersSent)
            res.status(500).json({ error: error.message });
        else {
            res.write(`\n[ERROR]: ${error.message}`);
            res.end();
        }
    }
});
/**
 * Discussion Stream (Legacy or Bulk)
 */
router.get('/stream', async (req, res) => {
    const validation = MissionSchema.safeParse(req.query);
    if (!validation.success)
        return res.status(400).json({ error: "參數驗證失敗", details: validation.error.format() });
    const { topic, agents, rounds, apiKey } = validation.data;
    const agentIds = (agents || "").split(',').filter(Boolean);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function')
        res.flushHeaders();
    res.write(':\n\n');
    if (agentIds.length === 0) {
        res.write(`data: ${JSON.stringify({ error: "未選擇活躍代理" })}\n\n`);
        return res.end();
    }
    await MissionService_1.missionOrchestrator.executeDiscussionStream(topic, agentIds, rounds, res, apiKey);
});
exports.default = router;
