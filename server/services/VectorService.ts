import { getAstraClient } from '../core/client';
import { GEMINI_API_KEY, isPaidTier } from '../core/config';
import { externalApiGate } from '../core/externalApiGate';
import fs from 'fs';
import path from 'path';

export interface VectorNode {
    id: string;
    content: string;
    agentCode: string;
    vector: number[];
    x: number;
    y: number;
    timestamp: number;
}

export class VectorService {
    private nodes: VectorNode[] = [];

    /**
     * Generate 768-dim Embedding using Gemini
     * Tier-Aware: Free -> 004 / Paid -> 2-preview (Multimodal)
     */
    async getEmbedding(input: string | any[]): Promise<number[]> {
        if (!GEMINI_API_KEY) return new Array(768).fill(0);
        
        try {
            const client = getAstraClient(GEMINI_API_KEY);
            // Default to 004 for text-only free tier, upgrade to 2-preview for multimodal or paid
            const modelName = isPaidTier || Array.isArray(input) ? 'gemini-embedding-2-preview' : 'text-embedding-004';

            return await externalApiGate.runExclusive(async () => {
                try {
                    const contentParts = Array.isArray(input) ? input : [{ text: input }];

                    const result = await (client as any).models.embedContent({
                        model: modelName,
                        content: { parts: contentParts },
                        config: { outputDimensionality: 768 }
                    });

                    let vector = result.embedding?.values ?? result.embeddings?.[0]?.values ?? [];

                    // Manual Normalization for truncated vectors (MRL Standard)
                    if (isPaidTier && vector.length > 0) {
                        const magnitude = Math.sqrt(vector.reduce((acc: number, val: number) => acc + val * val, 0));
                        if (magnitude > 0) {
                            vector = vector.map((v: number) => v / magnitude);
                        }
                    }

                    return vector;
                } catch (error) {
                    console.warn(`[VectorService] Primary model failed: ${modelName}`, error);
                    // Fallback to stable 004 via unified SDK
                    const fallbackText = Array.isArray(input) ? (input[0] as any).text : input;
                    const res = await (client as any).models.embedContent({
                        model: 'text-embedding-004',
                        content: { parts: [{ text: fallbackText }] },
                        config: { outputDimensionality: 768 }
                    });
                    return res.embedding?.values ?? res.embeddings?.[0]?.values ?? new Array(768).fill(0);
                }
            });
        } catch (e) {
            console.error('[VectorService] Embedding failed:', e);
            return new Array(768).fill(0);
        }
    }

    /**
     * Persistence: Save Graph to Disk
     */
    saveNodes() {
        const storagePath = path.join(process.cwd(), '.az_core', 'VECTOR_STORAGE.json');
        try {
            fs.writeFileSync(storagePath, JSON.stringify(this.nodes, null, 2), 'utf8');
            console.log(`[VectorPersistence] Graph saved: ${this.nodes.length} nodes`);
        } catch (e) {
            console.error('[VectorPersistence] Save failed:', e);
        }
    }

    /**
     * Persistence: Load Graph from Disk
     */
    loadNodes() {
        const storagePath = path.join(process.cwd(), '.az_core', 'VECTOR_STORAGE.json');
        if (fs.existsSync(storagePath)) {
            try {
                const data = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
                if (Array.isArray(data)) {
                    this.nodes = data;
                    console.log(`[VectorPersistence] Graph loaded: ${this.nodes.length} nodes`);
                }
            } catch (e) {
                console.error('[VectorPersistence] Load failed:', e);
            }
        }
    }

    /**
     * Calculate Cosine Similarity
     */
    cosineSimilarity(v1: number[], v2: number[]): number {
        let dot = 0, m1 = 0, m2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            m1 += v1[i] * v1[i];
            m2 += v2[i] * v2[i];
        }
        return dot / (Math.sqrt(m1) * Math.sqrt(m2));
    }

    /**
     * Add new node and calculate spatial position (Simple 2D projection)
     * Supports multimodal content (string or Part[])
     */
    async addNode(id: string, content: string | any[], agentCode: string): Promise<VectorNode> {
        const vector = await this.getEmbedding(content);
        
        // Use text summary for the 'content' field if it's a part array
        const contentStr = Array.isArray(content) 
            ? `[Multimodal Content: ${content.length} parts]` 
            : content;

        // Initial position: center + random offset
        let x = 500 + (Math.random() - 0.5) * 200;
        let y = 500 + (Math.random() - 0.5) * 200;

        // Semantic Gravity: Pull towards similar nodes
        if (this.nodes.length > 0) {
            let avgX = 0, avgY = 0, count = 0;
            this.nodes.forEach(n => {
                const sim = this.cosineSimilarity(vector, n.vector);
                if (sim > 0.7) { // Semantic threshold
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

        const newNode: VectorNode = {
            id, content: contentStr, agentCode, vector, x, y,
            timestamp: Date.now()
        };
        this.nodes.push(newNode);
        this.saveNodes(); // Auto-save on addition
        return newNode;
    }

    getGraphData() {
        const links: { source: string, target: string, value: number }[] = [];
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const sim = this.cosineSimilarity(this.nodes[i].vector, this.nodes[j].vector);
                if (sim > 0.75) {
                    links.push({
                        source: this.nodes[i].id,
                        target: this.nodes[j].id,
                        value: sim
                    });
                }
            }
        }
        return { nodes: this.nodes.map(n => ({ ...n, vector: [] })), links };
    }

    clear() { this.nodes = []; }

    /**
     * 🧭 圖譜導航器：提取圖譜上下文 (Graph-Aware Context)
     * 核心優化：取代傳統 RAG。不只找相似點，更沿著「語義連線」提取完整脈絡。
     */
    async getGraphContext(query: string, maxNodes: number = 5): Promise<string> {
        if (this.nodes.length === 0) return "";
        
        const queryVector = await this.getEmbedding(query);
        
        // 1. 找到最相關的起點 (Entry Points)
        const scoredNodes = this.nodes.map(n => ({
            node: n,
            score: this.cosineSimilarity(queryVector, n.vector)
        })).sort((a, b) => b.score - a.score);

        const entryNodes = scoredNodes.slice(0, 2).map(sn => sn.node);
        if (entryNodes.length === 0) return "";

        // 2. 沿著圖譜擴展 (Graph Traversal) - 尋找具有邏輯關聯的相鄰節點
        const contextNodes = new Set<VectorNode>(entryNodes);
        
        entryNodes.forEach(entry => {
            this.nodes.forEach(n => {
                if (!contextNodes.has(n) && contextNodes.size < maxNodes) {
                    const sim = this.cosineSimilarity(entry.vector, n.vector);
                    if (sim > 0.75) { // 連線閾值 (Link Threshold)
                        contextNodes.add(n);
                    }
                }
            });
        });

        // 3. 組合為結構化脈絡
        let contextStr = "【神經圖譜關聯知識 (Neural Graph Context)】\n";
        contextStr += "以下資訊並非隨機檢索，而是基於先前的邏輯推理路徑所提取的強關聯節點：\n\n";
        contextNodes.forEach(n => {
            contextStr += `[節點單元: ${n.agentCode} | 座標: X:${Math.round(n.x)}, Y:${Math.round(n.y)}]\n`;
            contextStr += `${n.content}\n---\n`;
        });
        return contextStr;
    }
}

export const vectorService = new VectorService();
