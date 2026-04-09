import { Router } from 'express';
import { vectorService } from '../services/VectorService';
import { pushLog } from '../services/LogService';

const router = Router();

/**
 * 🛰️ GET_SEMANTIC_GRAPH
 * Returns nodes with 2D coordinates and semantic links.
 */
router.get('/graph', (req, res) => {
    res.json(vectorService.getGraphData());
});

/**
 * 🧠 INJECT_DISCUSSION_NODE
 * Manually or automatically add a discussion segment to the vector space.
 */
router.post('/inject', async (req, res) => {
    const { id, content, agentCode } = req.body;
    if (!content) return res.status(400).json({ error: 'Missing content' });

    pushLog(`🧠 語義分析中: [${agentCode}] 內容正在向量化...`, 'info');
    const node = await vectorService.addNode(id || `node-${Date.now()}`, content, agentCode);
    
    res.json({ status: 'SUCCESS', node: { id: node.id, x: node.x, y: node.y } });
});

/**
 * 🧹 RESET_GRAPH
 */
router.post('/reset', (req, res) => {
    vectorService.clear();
    pushLog(`🧹 路徑分析圖譜已重置。`, 'warn');
    res.json({ status: 'SUCCESS' });
});

export default router;
