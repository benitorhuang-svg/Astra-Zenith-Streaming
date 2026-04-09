import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY, GCP_PROJECT, currentAuthMode } from './config';

/**
 * ASTRA CLIENT FACTORY
 * Provides the core Gemini client based on authentication mode.
 */

export interface AstraModelResponse {
    text: () => string | undefined;
}

export interface AstraGenerativeModel {
    generateContent(prompt: string): Promise<AstraModelResponse>;
    embedContent(text: string): Promise<{ embedding: { values: number[] } }>;
}

export interface AstraClient {
    listModels(): Promise<{ models: Array<{ name: string }> }>;
    getGenerativeModel(options: { model: string }): AstraGenerativeModel;
    models: {
        generateContentStream(args: {
            model: string;
            contents: unknown;
            systemInstruction: string;
            config?: Record<string, unknown>;
        }): AsyncIterable<{ text: () => string | undefined }>;
        generateContent(args: {
            model: string;
            contents: unknown;
            systemInstruction: string;
            config?: Record<string, unknown>;
        }): Promise<AstraModelResponse>;
    };
    caches: {
        create(args: {
            model: string;
            config: {
                displayName?: string;
                systemInstruction?: string;
                contents: any[];
                ttl?: string;
            };
        }): Promise<{ name: string }>;
        delete(name: string): Promise<void>;
    };
}

export const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';

export function getAstraClient(apiKey?: string): AstraClient {
    // 優先使用請求帶來的 Key，其次使用全域記憶體中的 Key
    const key = apiKey || GEMINI_API_KEY;
    
    if (apiKey || currentAuthMode === 'API') {
        if (!key) {
            console.error('❌ [AstraClient] 權限遺失：全域記憶體中找不到 API Key。');
            // 拋出一個物件，讓 Express 的 Global Error Handler 處理，防止伺服器崩潰
            throw { status: 401, message: 'API_KEY_EXPIRED_OR_MISSING' };
        }
        return new GoogleGenAI({ 
            apiKey: key,
            apiVersion: GEMINI_API_VERSION
        }) as unknown as AstraClient;
    } else {
        // Vertex AI Fallback (GCP Mode)
        return new GoogleGenAI({ 
            project: GCP_PROJECT, 
            location: 'us-central1', 
            vertexai: true,
            apiVersion: GEMINI_API_VERSION
        }) as unknown as AstraClient;
    }
}
