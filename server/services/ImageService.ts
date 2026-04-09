import { pushLog } from './LogService';
import { externalApiGate } from '../core/externalApiGate';
import { GEMINI_API_KEY } from '../core/config';

export class ImageService {
    async generateImage(prompt: string, apiKey?: string): Promise<string> {
        pushLog(`🎨 啟動 Imagen 4.0 Ultra 繪圖：${prompt.slice(0, 30)}...`, 'warn');

        const key = apiKey || GEMINI_API_KEY;
        if (!key) throw new Error('API Key is missing');

        const response = await externalApiGate.runExclusive(async () => {
            return await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-ultra-generate-001:predict?key=${key}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: "1:1",
                        imageSize: "1024x1024"
                    }
                })
            });
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'Image generation failed');
        }

        const result = await response.json();
        return result.predictions[0].bytesBase64;
    }
}

export const imageService = new ImageService();
