"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEMINI_API_VERSION = void 0;
exports.getAstraClient = getAstraClient;
const genai_1 = require("@google/genai");
const config_1 = require("./config");
/**
 * ASTRA CLIENT FACTORY (Singleton Edition)
 * Provides the core Gemini client with instance caching to optimize resource usage.
 */
const clientCache = new Map();
exports.GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';
/**
 * 🛰️ ASTRA_CLIENT_FACTORY (2026 Unified SDK Compliant)
 */
function getAstraClient(apiKey) {
    const key = apiKey || config_1.GEMINI_API_KEY;
    const cacheKey = `${key}_${config_1.currentAuthMode}`;
    if (clientCache.has(cacheKey)) {
        return clientCache.get(cacheKey);
    }
    const options = {
        apiVersion: exports.GEMINI_API_VERSION,
        httpOptions: {
            timeout: 30000 // 🚀 30s 全域逾時保護
        }
    };
    if (apiKey || config_1.currentAuthMode === 'API') {
        if (!key) {
            console.error('❌ [AstraClient] 權限遺失：全域記憶體中找不到 API Key。');
            throw { status: 401, message: 'API_KEY_EXPIRED_OR_MISSING' };
        }
        options.apiKey = key;
    }
    else {
        // 🚀 Vertex AI Optimization (GCP Mode)
        options.vertexai = true;
        options.project = config_1.GCP_PROJECT;
        options.location = process.env.GCP_LOCATION || 'us-central1';
    }
    const client = new genai_1.GoogleGenAI(options);
    clientCache.set(cacheKey, client);
    return client;
}
