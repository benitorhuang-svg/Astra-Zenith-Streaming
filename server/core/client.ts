import { GoogleGenAI, type GoogleGenAIOptions } from '@google/genai';
import { GEMINI_API_KEY, GCP_PROJECT, currentAuthMode } from './config';

/**
 * ASTRA CLIENT FACTORY (Singleton Edition)
 * Provides the core Gemini client with instance caching to optimize resource usage.
 */

const clientCache = new Map<string, GoogleGenAI>();

export const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';

/**
 * 🛰️ ASTRA_CLIENT_FACTORY (2026 Unified SDK Compliant)
 */
export function getAstraClient(apiKey?: string): GoogleGenAI {
    const key = apiKey || GEMINI_API_KEY;
    const cacheKey = `${key}_${currentAuthMode}`;

    if (clientCache.has(cacheKey)) {
        return clientCache.get(cacheKey)!;
    }
    
    const options: GoogleGenAIOptions = {
        apiVersion: GEMINI_API_VERSION as any,
        httpOptions: {
            timeout: 30000 // 🚀 30s 全域逾時保護
        }
    };

    if (apiKey || currentAuthMode === 'API') {
        if (!key) {
            console.error('❌ [AstraClient] 權限遺失：全域記憶體中找不到 API Key。');
            throw { status: 401, message: 'API_KEY_EXPIRED_OR_MISSING' };
        }
        options.apiKey = key;
    } else {
        // 🚀 Vertex AI Optimization (GCP Mode)
        options.vertexai = true;
        options.project = GCP_PROJECT;
        options.location = process.env.GCP_LOCATION || 'us-central1';
    }

    const client = new GoogleGenAI(options);
    clientCache.set(cacheKey, client);
    return client;
}
