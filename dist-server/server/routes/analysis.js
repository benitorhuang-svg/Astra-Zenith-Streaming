"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const VectorService_1 = require("../services/VectorService");
const LogService_1 = require("../services/LogService");
const router = (0, express_1.Router)();
/**
 * 🛰️ GET_SEMANTIC_GRAPH
 * Returns nodes with 2D coordinates and semantic links.
 */
router.get('/graph', (req, res) => {
    res.json(VectorService_1.vectorService.getGraphData());
});
/**
 * 🧠 INJECT_DISCUSSION_NODE
 * Manually or automatically add a discussion segment to the vector space.
 */
router.post('/inject', async (req, res) => {
    const { id, content, agentCode } = req.body;
    if (!content)
        return res.status(400).json({ error: 'Missing content' });
    (0, LogService_1.pushLog)(`🧠 語義分析中: [${agentCode}] 內容正在向量化...`, 'info');
    const node = await VectorService_1.vectorService.addNode(id || `node-${Date.now()}`, content, agentCode);
    res.json({ status: 'SUCCESS', node: { id: node.id, x: node.x, y: node.y } });
});
/**
 * 🧹 RESET_GRAPH
 */
router.post('/reset', (req, res) => {
    VectorService_1.vectorService.clear();
    (0, LogService_1.pushLog)(`🧹 路徑分析圖譜已重置。`, 'warn');
    res.json({ status: 'SUCCESS' });
});
exports.default = router;
