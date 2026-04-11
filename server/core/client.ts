import { GoogleGenAI, type GoogleGenAIOptions } from '@google/genai';
import { GEMINI_API_KEY, GCP_PROJECT, currentAuthMode } from './config';

/**
 * ASTRA CLIENT FACTORY
 * Provides the core Gemini client based on authentication mode.
 */

export interface AstraModelResponse {
    text: string;
    usageMetadata?: {
        promptTokenCount: number;
        candidatesTokenCount: number;
        totalTokenCount: number;
        cachedContentTokenCount?: number;
    };
}

export interface AstraGenerativeModel {
    generateContent(prompt: string): Promise<AstraModelResponse>;
    embedContent(text: string): Promise<{ embedding: { values: number[] } }>;
}

/**
 * 🛰️ ASTRA_CLIENT_INTERFACE (2026 Unified SDK Compliant)
 */
export interface AstraClient extends GoogleGenAI {
    models: GoogleGenAI['models'] & {
        generateContentStream(args: {
            model: string;
            contents: any;
            config?: {
                systemInstruction?: string;
                generationConfig?: Record<string, unknown>;
                safetySettings?: any[];
                tools?: any[];
                cachedContent?: string;
                responseMimeType?: string;
                responseSchema?: any;
            };
        }): AsyncIterable<{ text: string; usageMetadata?: any }>;
    };
}

export const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';

export function getAstraClient(apiKey?: string): AstraClient {
    const key = apiKey || GEMINI_API_KEY;
    
    const options: GoogleGenAIOptions = {
        apiVersion: GEMINI_API_VERSION as any
    };

    if (apiKey || currentAuthMode === 'API') {
        if (!key) {
            console.error('❌ [AstraClient] 權限遺失：全域記憶體中找不到 API Key。');
            throw { status: 401, message: 'API_KEY_EXPIRED_OR_MISSING' };
        }
        options.apiKey = key;
    } else {
        // Vertex AI Fallback (GCP Mode)
        options.vertexai = true;
        options.project = GCP_PROJECT;
        options.location = 'us-central1';
    }

    return new GoogleGenAI(options) as AstraClient;
}
