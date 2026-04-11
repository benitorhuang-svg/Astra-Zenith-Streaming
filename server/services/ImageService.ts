import { getAstraClient } from '../core/client';
import { pushLog } from './LogService';
import { externalApiGate } from '../core/externalApiGate';
import { GEMINI_API_KEY, isPaidTier } from '../core/config';

export class ImageService {
    async generateImage(prompt: string, apiKey?: string): Promise<string> {
        const modelName = isPaidTier ? 'imagen-3.0-generate-001' : 'imagen-3.0-generate-001';
        pushLog(`🎨 [Image_Gen] 啟動 Imagen 繪圖模型 (${modelName})：${prompt.slice(0, 30)}...`, 'warn');

        const key = apiKey || GEMINI_API_KEY;
        if (!key) throw new Error('API Key is missing');

        const client = getAstraClient(key);

        return await externalApiGate.runExclusive(async () => {
            try {
                const response = await client.models.generateImages({
                    model: modelName,
                    prompt: prompt,
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/jpeg',
                        aspectRatio: '1:1'
                    }
                });

                const base64 = response?.generatedImages?.[0]?.image?.imageBytes;
                if (!base64) throw new Error('Failed to extract image bytes from SDK response.');

                return base64;
            } catch (err: any) {
                console.error('[ImageService] Error:', err);
                throw new Error(err.message || 'Image generation failed via Unified SDK.', { cause: err });
            }
        });
    }
}

export const imageService = new ImageService();
