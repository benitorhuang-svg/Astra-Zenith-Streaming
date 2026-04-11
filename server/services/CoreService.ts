import fs from 'fs';
import path from 'path';
import { pushLog } from './LogService';
import { fileService } from './FileService';

/**
 * CORE SERVICE — Memory, Knowledge and Transcripts
 * Optimized for Harness Engineering v4.0
 */

export function saveConversationToCore(topic: string, fullContext: string) {
    const baseDir = path.join(process.cwd(), 'docs');
    const transcriptDir = path.join(baseDir, 'transcripts');
    const memoryPath = path.join(baseDir, 'MEMORY.md');

    if (!fs.existsSync(transcriptDir)) fs.mkdirSync(transcriptDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopic = topic.slice(0, 15).replace(/[^\w\s-]/gi, '').trim() || 'Mission';
    const filename = `AZ_Log_${timestamp}_${safeTopic}.md`;
    const filePath = path.join(transcriptDir, filename);

    const logContent = `# ASTRA ZENITH 戰術研討日誌\n## 主題：${topic}\n## 日期：${new Date().toLocaleString()}\n\n---\n\n${fullContext}`;
    fs.writeFileSync(filePath, logContent, 'utf8');

    if (fs.existsSync(memoryPath)) {
        let memoryContent = fs.readFileSync(memoryPath, 'utf8');
        const pointer = `- **ARCHIVE**: \`${new Date().toLocaleString()}\` | 主題: ${topic} | 路徑: \`docs/transcripts/${filename}\`\n`;
        if (memoryContent.includes('*(待對話啟動後')) {
            memoryContent = memoryContent.replace('*(待對話啟動後，Agent 會在此記錄重要對話的檔案路徑與關鍵字)*', pointer);
        } else {
            memoryContent += pointer;
        }
        fs.writeFileSync(memoryPath, memoryContent, 'utf8');
    }
    pushLog(`💾 [持久化] 研討紀錄已封存。`, 'success');
}

/**
 * 🚀 HARNESS_ALIGNED_FACT_SYNC: Solidifies facts into the official pointer map
 */
export function extractFactsToMemory(content: string) {
    const memoryPath = path.join(process.cwd(), 'docs', 'MEMORY.md');
    const factRegex = /\[FACT\]:\s*(.*)/g;
    let match;
    let found = false;

    while ((match = factRegex.exec(content)) !== null) {
        const fact = match[1].trim();
        if (fact && fs.existsSync(memoryPath)) {
            const entry = `\n- **SOLIDIFIED_FACT** (${new Date().toLocaleTimeString()}): ${fact}`;
            fs.appendFileSync(memoryPath, entry, 'utf8');
            found = true;
        }
    }
    if (found) pushLog(`🧠 核心事實已同步至全域指針地圖`, 'warn');
}

export function getLocalKnowledgeContext(): string {
    const baseDir = process.cwd();
    const files = fs.readdirSync(baseDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    let context = "\n\n### [LOCAL_KNOWLEDGE_SOURCE]:\n";
    for (const file of txtFiles) {
        const content = fs.readFileSync(path.join(baseDir, file), 'utf8').slice(0, 2000);
        context += `--- File: ${file} ---\n${content}\n\n`;
    }
    return txtFiles.length > 0 ? context : "";
}

export async function syncMultimodalKnowledge(vectorService: any) {
    const baseDir = process.cwd();
    const files = fs.readdirSync(baseDir).filter(f => /\.(jpg|png|pdf|webp)$/i.test(f));
    
    // 🚀 BATCH_SYNC_STRATEGY (2026 SDK Optimized)
    const pendingNodes: { id: string, parts: any[] }[] = [];

    for (const file of files) {
        const filePath = path.join(baseDir, file);
        try {
            const fileMeta = await fileService.uploadFile(filePath, `AZ_Asset_${file}`);
            if (!fileMeta) continue;
            const parts = [
                { text: `[Multimodal Knowledge: ${file}]` },
                { fileData: { mimeType: fileMeta.mimeType, fileUri: fileMeta.fileUri } }
            ];
            pendingNodes.push({ id: `file-${file}`, parts });
        } catch (e) { console.error(`[Multimodal_Upload_Err] ${file}`, e); }
    }

    if (pendingNodes.length > 0) {
        pushLog(`🧠 正在批次同步 ${pendingNodes.length} 個多模態知識節點...`, 'warn');
        for (const node of pendingNodes) {
            // VectorService addNode handles its own embedding internally, 
            // but we could further optimize by batching across nodes.
            // For now, the individual calls are safe within the concurrency gate.
            await vectorService.addNode(node.id, node.parts, 'ADMIN');
        }
    }
}
