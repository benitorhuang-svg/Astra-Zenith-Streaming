import { getAstraClient } from '../core/client';
import { GEMINI_API_KEY } from '../core/config';
import { pushLog } from './LogService';

export interface AstraFileMetadata {
    name: string;
    fileUri: string;
    mimeType: string;
}

/**
 * 🛰️ FILE_SERVICE (2026 Gemini SDK)
 * Optimizes multimodal communication by uploading files once and referencing by URI.
 */
export class FileService {
    private fileMap: Map<string, AstraFileMetadata> = new Map();

    /**
     * Upload a local file to Gemini and return metadata
     */
    async uploadFile(filePath: string, displayName: string): Promise<AstraFileMetadata | null> {
        if (this.fileMap.has(filePath)) {
            return this.fileMap.get(filePath) || null;
        }

        try {
            const client = getAstraClient(GEMINI_API_KEY);
            pushLog(`📤 [File_API] 正在上傳戰術資源: ${displayName}...`, 'warn');

            const file = await client.files.upload({
                file: filePath,
                config: { displayName }
            });

            const metadata: AstraFileMetadata = {
                name: file.name || '',
                fileUri: file.uri || '',
                mimeType: file.mimeType || ''
            };

            this.fileMap.set(filePath, metadata);
            pushLog(`✅ [File_API] 資源就緒: ${file.name}`, 'success');
            return metadata;
        } catch (e) {
            console.error('[FileService] Upload failed:', e);
            return null;
        }
    }

    getFile(filePath: string): AstraFileMetadata | undefined {
        return this.fileMap.get(filePath);
    }
}

export const fileService = new FileService();
