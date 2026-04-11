"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageService = exports.ImageService = void 0;
const client_1 = require("../core/client");
const LogService_1 = require("./LogService");
const externalApiGate_1 = require("../core/externalApiGate");
const config_1 = require("../core/config");
class ImageService {
    async generateImage(prompt, apiKey) {
        const modelName = config_1.isPaidTier ? 'imagen-3.0-generate-001' : 'imagen-3.0-generate-001';
        (0, LogService_1.pushLog)(`🎨 [Image_Gen] 啟動 Imagen 繪圖模型 (${modelName})：${prompt.slice(0, 30)}...`, 'warn');
        const key = apiKey || config_1.GEMINI_API_KEY;
        if (!key)
            throw new Error('API Key is missing');
        const client = (0, client_1.getAstraClient)(key);
        return await externalApiGate_1.externalApiGate.runExclusive(async () => {
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
                if (!base64)
                    throw new Error('Failed to extract image bytes from SDK response.');
                return base64;
            }
            catch (err) {
                console.error('[ImageService] Error:', err);
                throw new Error(err.message || 'Image generation failed via Unified SDK.', { cause: err });
            }
        });
    }
}
exports.ImageService = ImageService;
exports.imageService = new ImageService();
