"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorService = exports.VectorService = void 0;
const EmbeddingService_1 = require("./EmbeddingService");
const VectorPersistence_1 = require("./VectorPersistence");
class VectorService {
    nodes = [];
    constructor() {
        this.loadNodes();
    }
    saveTimeout = null;
    saveNodes() {
        // 🚀 BUFFERED_IO_STRATEGY
        if (this.saveTimeout)
            clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            VectorPersistence_1.vectorPersistence.saveNodes(this.nodes);
            this.saveTimeout = null;
        }, 2000); // 🚀 2s Grace period for batch writes
    }
    loadNodes() {
        this.nodes = VectorPersistence_1.vectorPersistence.loadNodes();
    }
    /**
     * Calculate Cosine Similarity
     */
    cosineSimilarity(v1, v2) {
        let dot = 0, m1 = 0, m2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            m1 += v1[i] * v1[i];
            m2 += v2[i] * v2[i];
        }
        if (m1 === 0 || m2 === 0)
            return 0;
        return dot / (Math.sqrt(m1) * Math.sqrt(m2));
    }
    /**
     * Add new node and calculate spatial position (Simple 2D projection)
     */
    async addNode(id, content, agentCode, parentId, type = 'LEAF', title) {
        const vector = await EmbeddingService_1.embeddingService.getEmbedding(content);
        const contentLabel = Array.isArray(content)
            ? `[Multimodal Content: ${content.length} parts]`
            : content;
        // Base coordinates influenced by Parent if available
        let x = 500 + (Math.random() - 0.5) * 200;
        let y = 500 + (Math.random() - 0.5) * 200;
        if (parentId) {
            const parent = this.nodes.find(n => n.id === parentId);
            if (parent) {
                x = parent.x + (Math.random() - 0.5) * 100;
                y = parent.y + (Math.random() - 0.5) * 100;
            }
        }
        // Semantic Gravity (Secondary influence)
        if (this.nodes.length > 0) {
            let avgX = 0, avgY = 0, count = 0;
            this.nodes.forEach(n => {
                const sim = this.cosineSimilarity(vector, n.vector);
                if (sim > 0.8) {
                    avgX += n.x * sim;
                    avgY += n.y * sim;
                    count += sim;
                }
            });
            if (count > 0) {
                x = (x + (avgX / count)) / 2;
                y = (y + (avgY / count)) / 2;
            }
        }
        const newNode = {
            id, content, agentCode, vector, x, y,
            timestamp: Date.now(),
            parentId,
            type,
            title: title || (typeof content === 'string' ? content.slice(0, 30) : contentLabel.slice(0, 30)) + '...'
        };
        this.nodes.push(newNode);
        this.saveNodes();
        return newNode;
    }
    /**
     * 🧭 圖譜導航器 (Multimodal Parts Edition)
     */
    async getGraphContextParts(query, maxNodes = 5) {
        if (this.nodes.length === 0)
            return [];
        const queryVector = await EmbeddingService_1.embeddingService.getEmbedding(query, true); // 🚀 Query Mode
        const scoredNodes = this.nodes.map(n => ({
            node: n,
            score: this.cosineSimilarity(queryVector, n.vector)
        })).sort((a, b) => b.score - a.score);
        const entryNodes = scoredNodes.slice(0, 2).map(sn => sn.node);
        if (entryNodes.length === 0)
            return [];
        const contextNodes = new Set(entryNodes);
        entryNodes.forEach(entry => {
            this.nodes.forEach(n => {
                if (!contextNodes.has(n) && contextNodes.size < maxNodes) {
                    if (this.cosineSimilarity(entry.vector, n.vector) > 0.75)
                        contextNodes.add(n);
                }
            });
        });
        const finalParts = [{ text: "【神經圖譜關聯知識 (Neural Graph Context)】\n以下資訊為基於邏輯推理路徑所提取的強關聯節點：\n" }];
        contextNodes.forEach(n => {
            finalParts.push({ text: `\n[節點單元: ${n.agentCode}]\n` });
            if (Array.isArray(n.content)) {
                finalParts.push(...n.content);
            }
            else {
                finalParts.push({ text: String(n.content) });
            }
            finalParts.push({ text: "\n---\n" });
        });
        return finalParts;
    }
    getGraphData() {
        const links = [];
        // 1. Hierarchical Links (Explicit Parent-Child)
        this.nodes.forEach(n => {
            if (n.parentId) {
                links.push({
                    source: n.parentId,
                    target: n.id,
                    value: 1.0,
                    type: 'HIERARCHICAL'
                });
            }
        });
        // 2. Semantic Links (Vector Similarity)
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                if (this.nodes[i].parentId === this.nodes[j].id || this.nodes[j].parentId === this.nodes[i].id)
                    continue;
                const sim = this.cosineSimilarity(this.nodes[i].vector, this.nodes[j].vector);
                if (sim > 0.82) { // Higher threshold for semantic links when we have hierarchy
                    links.push({
                        source: this.nodes[i].id,
                        target: this.nodes[j].id,
                        value: sim,
                        type: 'SEMANTIC'
                    });
                }
            }
        }
        return { nodes: this.nodes.map(n => ({ ...n, vector: [] })), links };
    }
    clear() { this.nodes = []; }
    /**
     * 🧭 圖譜導航器：提取圖譜上下文
     */
    async getGraphContext(query, maxNodes = 5) {
        if (this.nodes.length === 0)
            return "";
        const queryVector = await EmbeddingService_1.embeddingService.getEmbedding(query);
        const scoredNodes = this.nodes.map(n => ({
            node: n,
            score: this.cosineSimilarity(queryVector, n.vector)
        })).sort((a, b) => b.score - a.score);
        const entryNodes = scoredNodes.slice(0, 2).map(sn => sn.node);
        if (entryNodes.length === 0)
            return "";
        const contextNodes = new Set(entryNodes);
        entryNodes.forEach(entry => {
            this.nodes.forEach(n => {
                if (!contextNodes.has(n) && contextNodes.size < maxNodes) {
                    const sim = this.cosineSimilarity(entry.vector, n.vector);
                    if (sim > 0.75) {
                        contextNodes.add(n);
                    }
                }
            });
        });
        let contextStr = "【神經圖譜關聯知識 (Neural Graph Context)】\n";
        contextStr += "以下資訊並非隨機檢索，而是基於先前的邏輯推理路徑所提取的強關聯節點：\n\n";
        contextNodes.forEach(n => {
            contextStr += `[節點單元: ${n.agentCode} | 座標: X:${Math.round(n.x)}, Y:${Math.round(n.y)}]\n`;
            contextStr += `${n.content}\n---\n`;
        });
        return contextStr;
    }
}
exports.VectorService = VectorService;
exports.vectorService = new VectorService();
