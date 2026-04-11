"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveConversationToCore = saveConversationToCore;
exports.extractFactsToMemory = extractFactsToMemory;
exports.getLocalKnowledgeContext = getLocalKnowledgeContext;
exports.syncMultimodalKnowledge = syncMultimodalKnowledge;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LogService_1 = require("./LogService");
const FileService_1 = require("./FileService");
/**
 * CORE SERVICE — Memory, Knowledge and Transcripts
 * Optimized for Harness Engineering v4.0
 */
function saveConversationToCore(topic, fullContext) {
    const baseDir = path_1.default.join(process.cwd(), 'docs');
    const transcriptDir = path_1.default.join(baseDir, 'transcripts');
    const memoryPath = path_1.default.join(baseDir, 'MEMORY.md');
    if (!fs_1.default.existsSync(transcriptDir))
        fs_1.default.mkdirSync(transcriptDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTopic = topic.slice(0, 15).replace(/[^\w\s-]/gi, '').trim() || 'Mission';
    const filename = `AZ_Log_${timestamp}_${safeTopic}.md`;
    const filePath = path_1.default.join(transcriptDir, filename);
    const logContent = `# ASTRA ZENITH 戰術研討日誌\n## 主題：${topic}\n## 日期：${new Date().toLocaleString()}\n\n---\n\n${fullContext}`;
    fs_1.default.writeFileSync(filePath, logContent, 'utf8');
    if (fs_1.default.existsSync(memoryPath)) {
        let memoryContent = fs_1.default.readFileSync(memoryPath, 'utf8');
        const pointer = `- **ARCHIVE**: \`${new Date().toLocaleString()}\` | 主題: ${topic} | 路徑: \`docs/transcripts/${filename}\`\n`;
        if (memoryContent.includes('*(待對話啟動後')) {
            memoryContent = memoryContent.replace('*(待對話啟動後，Agent 會在此記錄重要對話的檔案路徑與關鍵字)*', pointer);
        }
        else {
            memoryContent += pointer;
        }
        fs_1.default.writeFileSync(memoryPath, memoryContent, 'utf8');
    }
    (0, LogService_1.pushLog)(`💾 [持久化] 研討紀錄已封存。`, 'success');
}
/**
 * 🚀 HARNESS_ALIGNED_FACT_SYNC: Solidifies facts into the official pointer map
 */
function extractFactsToMemory(content) {
    const memoryPath = path_1.default.join(process.cwd(), 'docs', 'MEMORY.md');
    const factRegex = /\[FACT\]:\s*(.*)/g;
    let match;
    let found = false;
    while ((match = factRegex.exec(content)) !== null) {
        const fact = match[1].trim();
        if (fact && fs_1.default.existsSync(memoryPath)) {
            const entry = `\n- **SOLIDIFIED_FACT** (${new Date().toLocaleTimeString()}): ${fact}`;
            fs_1.default.appendFileSync(memoryPath, entry, 'utf8');
            found = true;
        }
    }
    if (found)
        (0, LogService_1.pushLog)(`🧠 核心事實已同步至全域指針地圖`, 'warn');
}
function getLocalKnowledgeContext() {
    const baseDir = process.cwd();
    const files = fs_1.default.readdirSync(baseDir);
    const txtFiles = files.filter(f => f.endsWith('.txt'));
    let context = "\n\n### [LOCAL_KNOWLEDGE_SOURCE]:\n";
    for (const file of txtFiles) {
        const content = fs_1.default.readFileSync(path_1.default.join(baseDir, file), 'utf8').slice(0, 2000);
        context += `--- File: ${file} ---\n${content}\n\n`;
    }
    return txtFiles.length > 0 ? context : "";
}
async function syncMultimodalKnowledge(vectorService) {
    const baseDir = process.cwd();
    const files = fs_1.default.readdirSync(baseDir).filter(f => /\.(jpg|png|pdf|webp)$/i.test(f));
    // 🚀 BATCH_SYNC_STRATEGY (2026 SDK Optimized)
    const pendingNodes = [];
    for (const file of files) {
        const filePath = path_1.default.join(baseDir, file);
        try {
            const fileMeta = await FileService_1.fileService.uploadFile(filePath, `AZ_Asset_${file}`);
            if (!fileMeta)
                continue;
            const parts = [
                { text: `[Multimodal Knowledge: ${file}]` },
                { fileData: { mimeType: fileMeta.mimeType, fileUri: fileMeta.fileUri } }
            ];
            pendingNodes.push({ id: `file-${file}`, parts });
        }
        catch (e) {
            console.error(`[Multimodal_Upload_Err] ${file}`, e);
        }
    }
    if (pendingNodes.length > 0) {
        (0, LogService_1.pushLog)(`🧠 正在批次同步 ${pendingNodes.length} 個多模態知識節點...`, 'warn');
        for (const node of pendingNodes) {
            // VectorService addNode handles its own embedding internally, 
            // but we could further optimize by batching across nodes.
            // For now, the individual calls are safe within the concurrency gate.
            await vectorService.addNode(node.id, node.parts, 'ADMIN');
        }
    }
}
