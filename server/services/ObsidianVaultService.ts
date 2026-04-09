import fs from 'fs';
import path from 'path';
import { vectorService } from './VectorService';
import { pushLog } from './LogService';

/**
 * 🗄️ Obsidian Vault Service
 * 負責將記憶體中的向量圖譜，降維打擊並沉澱為具備雙向連結的 Obsidian Markdown 實體檔案。
 * 對應白皮書：第五章 資料存儲與個人知識庫 (Storage Architecture)
 */
export class ObsidianVaultService {
    private vaultPath: string;

    constructor() {
        // 預設將 Vault 建置在 .az_core 下，未來可直接 mapping 到 Google Drive
        this.vaultPath = path.join(process.cwd(), 'Astra Zenith Streaming', '.az_core', 'vault');
        if (!fs.existsSync(this.vaultPath)) {
            fs.mkdirSync(this.vaultPath, { recursive: true });
            pushLog(`🗄️ Obsidian Vault 初始化完成: ${this.vaultPath}`, 'info');
        }
    }

    /**
     * 將當前任務的語義圖譜匯出為 Obsidian 格式
     */
    exportGraphToVault(missionTopic: string) {
        const { nodes, links } = vectorService.getGraphData();
        if (nodes.length === 0) return;

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const topicSlug = missionTopic.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 20) || 'Mission';
        
        // 1. 建立本次任務的入口 MOC (Map of Content) 節點
        const mocFileName = `MOC_${topicSlug}_${timestamp}.md`;
        let mocContent = `---\ntype: MOC\ntopic: ${missionTopic}\ndate: ${timestamp}\n---\n\n`;
        mocContent += `# 任務總覽：${missionTopic}\n\n## 參與節點矩陣 (Active Nodes)\n`;

        nodes.forEach(node => {
            const nodeFileName = `Node_${node.id}.md`;
            mocContent += `- [[${nodeFileName.replace('.md', '')}]] (由 Agent ${node.agentCode} 貢獻)\n`;

            // 尋找此節點的連線 (雙向連結)
            const connectedNodes = links
                .filter(l => l.source === node.id || l.target === node.id)
                .map(l => l.source === node.id ? l.target : l.source);

            // 2. 構建單一知識節點 (Knowledge Node)
            let nodeContent = `---\n`;
            nodeContent += `agent: ${node.agentCode}\n`;
            nodeContent += `timestamp: ${node.timestamp}\n`;
            nodeContent += `coordinate_x: ${Math.round(node.x)}\n`;
            nodeContent += `coordinate_y: ${Math.round(node.y)}\n`;
            nodeContent += `tags: [agent_os, semantic_node]\n`;
            nodeContent += `---\n\n`;
            nodeContent += `# 神經節點：${node.id}\n\n`;
            nodeContent += `## 核心邏輯 (Core Logic)\n${node.content}\n\n`;
            
            if (connectedNodes.length > 0) {
                nodeContent += `## 語義引力關聯 (Semantic Gravity Links)\n`;
                nodeContent += `> 以下節點在向量空間中與此節點具備高強度的邏輯連貫性：\n\n`;
                connectedNodes.forEach(targetId => {
                    nodeContent += `- [[Node_${targetId}]]\n`;
                });
            }

            fs.writeFileSync(path.join(this.vaultPath, nodeFileName), nodeContent, 'utf-8');
        });

        // 寫入 MOC
        fs.writeFileSync(path.join(this.vaultPath, mocFileName), mocContent, 'utf-8');
        pushLog(`📥 知識沉澱完成：已將 ${nodes.length} 個節點實體化至 Obsidian Vault。`, 'success');
        
        // 重置圖譜準備下一次任務
        vectorService.clear();
    }
}

export const vaultService = new ObsidianVaultService();