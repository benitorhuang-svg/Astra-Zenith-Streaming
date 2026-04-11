"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileService = exports.FileService = void 0;
const client_1 = require("../core/client");
const config_1 = require("../core/config");
const LogService_1 = require("./LogService");
/**
 * 🛰️ FILE_SERVICE (2026 Gemini SDK)
 * Optimizes multimodal communication by uploading files once and referencing by URI.
 */
class FileService {
    fileMap = new Map();
    /**
     * Upload a local file to Gemini and return metadata
     */
    async uploadFile(filePath, displayName) {
        if (this.fileMap.has(filePath)) {
            return this.fileMap.get(filePath) || null;
        }
        try {
            const client = (0, client_1.getAstraClient)(config_1.GEMINI_API_KEY);
            (0, LogService_1.pushLog)(`📤 [File_API] 正在上傳戰術資源: ${displayName}...`, 'warn');
            // 🚀 SDK_NATIVE_FILE_UPLOAD (2026 Standard)
            const file = await client.files.upload({
                file: filePath,
                config: { displayName }
            });
            const metadata = {
                name: file.name || '',
                fileUri: file.uri || '',
                mimeType: file.mimeType || ''
            };
            this.fileMap.set(filePath, metadata);
            (0, LogService_1.pushLog)(`✅ [File_API] 資源就緒: ${file.name}`, 'success');
            return metadata;
        }
        catch (e) {
            console.error('[FileService] Upload failed:', e);
            return null;
        }
    }
    /**
     * Active resource cleanup to maintain governance
     */
    async deleteFile(name) {
        try {
            const client = (0, client_1.getAstraClient)(config_1.GEMINI_API_KEY);
            await client.files.delete({ name });
            (0, LogService_1.pushLog)(`🗑️ [File_API] 資源已主動釋放: ${name}`, 'info');
        }
        catch { /* noop */ }
    }
    getFile(filePath) {
        return this.fileMap.get(filePath);
    }
}
exports.FileService = FileService;
exports.fileService = new FileService();
