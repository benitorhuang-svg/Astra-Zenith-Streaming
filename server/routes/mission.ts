import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pushLog } from '../services/LogService';
import { pool } from '../models/Agent';
import { setGeminiKey, GEMINI_API_KEY } from '../core/config';
import { missionOrchestrator } from '../services/MissionService';
import { imageService } from '../services/ImageService';
import fs from 'fs';
import path from 'path';
import { harnessService } from '../services/HarnessEngineeringService';

const router = Router();

// Validation Schema
const MissionSchema = z.object({
    topic: z.string().min(2),
    agents: z.string().optional(),
    rounds: z.string().or(z.number()).optional().transform(v => parseInt(v as string) || 1),
    apiKey: z.string().optional()
});

interface MissionInitiateBody {
    topic?: string;
    agent_sequence?: string[];
    apiKey?: string;
    missionId?: string;
    harnessState?: any;
}

interface ImageRequestBody {
    prompt?: string;
    apiKey?: string;
    missionId?: string;
    harnessState?: any;
}

interface GenerateStreamBody {
    messages?: Array<{ role?: string; content: string }>;
    agentId?: string;
    apiKey?: string;
    missionId?: string;
    model?: string;
}

/**
 * Mission Initiation
 */
const initiateHandler = async (req: Request, res: Response) => {
    try {
        const body = (req.body ?? {}) as MissionInitiateBody;
        const { topic, agent_sequence, apiKey, missionId, harnessState } = body;
        
        if (!topic) throw new Error('topic is missing');
        if (!agent_sequence || !Array.isArray(agent_sequence)) throw new Error('agent_sequence is missing or not an array');

        const finalMissionId = missionId || `mission-${Date.now()}`;
        harnessService.initializeMission(finalMissionId, topic, harnessState);

        if (apiKey) {
            setGeminiKey(apiKey);
            pushLog(`🔗 偵測到會話金鑰，後端記憶體已重新同步。`, 'success');
        }

        const agentStatePath = path.join(process.cwd(), 'server', 'core', 'AGENT_STATE.json');
        if (fs.existsSync(agentStatePath)) {
            const state = JSON.parse(fs.readFileSync(agentStatePath, 'utf8'));
            await pool.warmup(state.agent_pool);
            pushLog(`⚙️ 任務配置同步 (ID: ${finalMissionId})`, 'info');
        }

        pushLog(`🎯 任務啟動："${topic}"`, 'warn');
        res.json({ status: 'SUCCESS', topic, missionId: finalMissionId });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

router.post('/initiate', initiateHandler);
router.post('/mission/initiate', initiateHandler);

/**
 * Image Generation (Harness Fact-Aware)
 */
router.post('/generate-image', async (req: Request, res: Response) => {
    try {
        const { prompt, apiKey, harnessState } = (req.body ?? {}) as ImageRequestBody;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        // 🚀 FACT_AWARE_IMAGE_PROMPT: Augment the prompt with consolidated facts from Harness
        let augmentedPrompt = prompt;
        if (harnessState && harnessState.facts && harnessState.facts.length > 0) {
            const factSummary = harnessState.facts.map((f: any) => f.content).join(', ');
            augmentedPrompt = `[TACTICAL_CONTEXT: ${factSummary}]\n\n${prompt}`;
        }

        const base64Image = await imageService.generateImage(augmentedPrompt, apiKey);
        res.json({ status: 'SUCCESS', image: base64Image });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Plain Text Discovery Stream
 */
router.post('/generate-stream', async (req: Request, res: Response) => {
    const { messages, agentId, apiKey, model } = (req.body ?? {}) as GenerateStreamBody;
    const id = agentId || 'A1';
    const effectiveKey = apiKey || GEMINI_API_KEY;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages array is required' });
    }

    try {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');
        if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
        res.write('\n');

        await pool.sendMessage(id, messages, (chunk) => {
            res.write(String(chunk));
        }, effectiveKey, undefined, model);

        res.end();
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
        else {
            res.write(`\n[ERROR]: ${error.message}`);
            res.end();
        }
    }
});

/**
 * Discussion Stream (Legacy or Bulk)
 */
router.get('/stream', async (req: Request, res: Response) => {
    const validation = MissionSchema.safeParse(req.query);
    if (!validation.success) return res.status(400).json({ error: "參數驗證失敗", details: validation.error.format() });
    const { topic, agents, rounds, apiKey } = validation.data;
    const agentIds = (agents || "").split(',').filter(Boolean);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') (res as any).flushHeaders();
    res.write(':\n\n'); 
    if (agentIds.length === 0) {
        res.write(`data: ${JSON.stringify({ error: "未選擇活躍代理" })}\n\n`);
        return res.end();
    }
    await missionOrchestrator.executeDiscussionStream(topic, agentIds, rounds, res, apiKey);
});

export default router;
