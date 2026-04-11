import { VectorNode, GraphData } from './VectorTypes';
import { embeddingService } from './EmbeddingService';
import { vectorPersistence } from './VectorPersistence';

export class VectorService {
    private nodes: VectorNode[] = [];

    constructor() {
        this.loadNodes();
    }

    saveNodes() {
        vectorPersistence.saveNodes(this.nodes);
    }

    loadNodes() {
        this.nodes = vectorPersistence.loadNodes();
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
        if (m1 === 0 || m2 === 0) return 0;
        return dot / (Math.sqrt(m1) * Math.sqrt(m2));
    }

    /**
     * Add new node and calculate spatial position (Simple 2D projection)
     */
    async addNode(
        id: string, 
        content: string | any[], 
        agentCode: string, 
        parentId?: string, 
        type: VectorNodeType = 'LEAF',
        title?: string
    ): Promise<VectorNode> {
        const vector = await embeddingService.getEmbedding(content);
        
        const contentStr = Array.isArray(content) 
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

        const newNode: VectorNode = {
            id, content: contentStr, agentCode, vector, x, y,
            timestamp: Date.now(),
            parentId,
            type,
            title: title || (contentStr.slice(0, 30) + '...')
        };
        this.nodes.push(newNode);
        this.saveNodes();
        return newNode;
    }

    getGraphData(): GraphData {
        const links: any[] = [];
        
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
                if (this.nodes[i].parentId === this.nodes[j].id || this.nodes[j].parentId === this.nodes[i].id) continue;
                
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
    async getGraphContext(query: string, maxNodes: number = 5): Promise<string> {
        if (this.nodes.length === 0) return "";
        
        const queryVector = await embeddingService.getEmbedding(query);
        
        const scoredNodes = this.nodes.map(n => ({
            node: n,
            score: this.cosineSimilarity(queryVector, n.vector)
        })).sort((a, b) => b.score - a.score);

        const entryNodes = scoredNodes.slice(0, 2).map(sn => sn.node);
        if (entryNodes.length === 0) return "";

        const contextNodes = new Set<VectorNode>(entryNodes);
        
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

export const vectorService = new VectorService();
