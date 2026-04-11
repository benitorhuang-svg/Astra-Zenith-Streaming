import fs from 'fs';
import path from 'path';
import { pushLog } from './LogService';
import { fileService } from './FileService';

/**
 * CORE SERVICE — Memory, Knowledge and Transcripts
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

    // 1. Write Transcript
    const logContent = `# ASTRA ZENITH 戰術研討日誌\n## 主題：${topic}\n## 日期：${new Date().toLocaleString()}\n\n---\n\n${fullContext}`;
    fs.writeFileSync(filePath, logContent, 'utf8');

    // 2. Update MEMORY map
    if (fs.existsSync(memoryPath)) {
        let memoryContent = fs.readFileSync(memoryPath, 'utf8');
        const pointer = `- **ARCHIVE**: \`${new Date().toLocaleString()}\` | 主題: ${topic} | 路徑: \`docs/transcripts/${filename}\`\n`;
        
        if (memoryContent.includes('*(待對話啟動後，Agent 會在此記錄重要對話的檔案路徑與關鍵字)*')) {
            memoryContent = memoryContent.replace('*(待對話啟動後，Agent 會在此記錄重要對話的檔案路徑與關鍵字)*', pointer);
        } else {
            memoryContent += pointer;
        }
        fs.writeFileSync(memoryPath, memoryContent, 'utf8');
    }

    pushLog(`💾 [持久化] 研討紀錄已封存：${filename}`, 'success');
}

export function extractFactsToMemory(content: string) {
    const memoryPath = path.join(process.cwd(), 'docs', 'MEMORY.md');
    const factRegex = /\[FACT\]\s*(.*)/g;
    let match;
    let found = false;

    while ((match = factRegex.exec(content)) !== null) {
        const fact = match[1].trim();
        if (fact && fs.existsSync(memoryPath)) {
            const entry = `\n- **FACT** (${new Date().toLocaleTimeString()}): ${fact}`;
            fs.appendFileSync(memoryPath, entry, 'utf8');
            found = true;
        }
    }
    if (found) pushLog(`🧠 檢測到核心事實：已同步至指針地圖`, 'warn');
}

export function getLocalKnowledgeContext(): string {
    const baseDir = process.cwd();
    const files = fs.readdirSync(baseDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    let context = "\n\n### [3.2] 本地背景知識庫 (Knowledge Source):\n";
    
    for (const file of txtFiles) {
        const content = fs.readFileSync(path.join(baseDir, file), 'utf8').slice(0, 2000);
        context += `--- File: ${file} ---\n${content}\n\n`;
    }
    
    // Add multimodal summary
    const multiFiles = files.filter(f => /\.(jpg|png|pdf|webp)$/i.test(f));
    if (multiFiles.length > 0) {
        context += `[檢測到多模態資源: ${multiFiles.join(', ')}]\n這些資源已編入語義圖譜，可隨時調用。\n`;
    }

    return (txtFiles.length > 0 || multiFiles.length > 0) ? context : "";
}

/**
 * 🛰️ MULTIMODAL SYNC: Ingest images/PDFs into Vector Graph (Optimized via File API)
 */
export async function syncMultimodalKnowledge(vectorService: any) {
    const baseDir = process.cwd();
    const files = fs.readdirSync(baseDir).filter(f => /\.(jpg|png|pdf|webp)$/i.test(f));
    
    for (const file of files) {
        const filePath = path.join(baseDir, file);
        const stats = fs.statSync(filePath);
        if (stats.size > 20 * 1024 * 1024) continue; // Skip files > 20MB

        try {
            // Optimization: Use File API for efficient transport
            const fileMeta = await fileService.uploadFile(filePath, `AZ_Asset_${file}`);
            if (!fileMeta) continue;

            const parts = [
                { text: `[Multimodal Knowledge Source: ${file}]` },
                { fileData: { mimeType: fileMeta.mimeType, fileUri: fileMeta.fileUri } }
            ];

            await vectorService.addNode(`file-${file}-${stats.mtimeMs}`, parts, 'ADMIN');
        } catch (e) {
            console.error(`[MultimodalSync] Failed for ${file}:`, e);
        }
    }
}
