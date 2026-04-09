import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { pushLog } from '../services/LogService';
import { pool } from '../models/Agent';
import { setGeminiKey, GEMINI_API_KEY } from '../core/config';
import { missionOrchestrator } from '../services/MissionService';
import { imageService } from '../services/ImageService';
import fs from 'fs';
import path from 'path';

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
}

interface ImageRequestBody {
    prompt?: string;
    apiKey?: string;
}

interface GenerateStreamBody {
    messages?: Array<{ role?: string; content: string }>;
    agentId?: string;
    apiKey?: string;
}

/**
 * Mission Initiation
 */
const initiateHandler = async (req: Request, res: Response) => {
    try {
        const body = (req.body ?? {}) as MissionInitiateBody;
        const { topic, agent_sequence, apiKey } = body;
        
        if (!topic) throw new Error('topic is missing');
        if (!agent_sequence || !Array.isArray(agent_sequence)) throw new Error('agent_sequence is missing or not an array');

        if (apiKey) {
            setGeminiKey(apiKey);
            pushLog(`🔗 偵測到會話金鑰，後端記憶體已重新同步。`, 'success');
        }

        // Re-warmup pool from core definition (Standard path)
        const agentStatePath = path.join(process.cwd(), 'server', 'core', 'AGENT_STATE.json');
        if (fs.existsSync(agentStatePath)) {
            const state = JSON.parse(fs.readFileSync(agentStatePath, 'utf8'));
            await pool.warmup(state.agent_pool);
            pushLog(`⚙️ 任務配置已同步 (版本: ${state.system.version})`, 'info');
        }

        pushLog(`🎯 任務啟動："${topic}" (序列: ${agent_sequence.join(' -> ')})`, 'warn');
        res.json({ status: 'SUCCESS', topic });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

router.post('/initiate', initiateHandler);
router.post('/mission/initiate', initiateHandler);

/**
 * Image Generation (Imagen 4.0 Ultra)
 */
router.post('/generate-image', async (req: Request, res: Response) => {
    try {
        const { prompt, apiKey } = (req.body ?? {}) as ImageRequestBody;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const base64Image = await imageService.generateImage(prompt, apiKey);
        res.json({ status: 'SUCCESS', image: base64Image });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * Discussion Stream (Atomic Orchestrator)
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

/**
 * Plain Text Discovery Stream
 */
router.post('/generate-stream', async (req: Request, res: Response) => {
    const { messages, agentId, apiKey } = (req.body ?? {}) as GenerateStreamBody;
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
        }, effectiveKey);

        res.end();
    } catch (error: any) {
        if (!res.headersSent) res.status(500).json({ error: error.message });
        else {
            res.write(`\n[ERROR]: ${error.message}`);
            res.end();
        }
    }
});

export default router;
