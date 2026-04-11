"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextCacheService = exports.ContextCacheService = void 0;
const client_1 = require("../core/client");
const config_1 = require("../core/config");
const LogService_1 = require("./LogService");
/**
 * 🛰️ CONTEXT CACHE SERVICE (Gemini Cookbook)
 * Manages explicit caches for Paid Tier users to reduce costs and latency.
 */
class ContextCacheService {
    caches = new Map();
    /**
     * Create or retrieve a cache for the given content
     */
    async getOrCreateCache(key, model, systemInstruction, content) {
        if (!config_1.isPaidTier || !config_1.GEMINI_API_KEY)
            return null;
        const existing = this.caches.get(key);
        if (existing && existing.expiresAt > Date.now()) {
            return existing.name;
        }
        try {
            const client = (0, client_1.getAstraClient)(config_1.GEMINI_API_KEY);
            (0, LogService_1.pushLog)(`📦 [Cache] 正在為 Paid Tier 建立快取實體...`, 'warn');
            const cache = await client.caches.create({
                model,
                config: {
                    displayName: `AZ_Cache_${key.slice(0, 8)}`,
                    systemInstruction,
                    contents: [{ role: 'user', parts: [{ text: content }] }],
                    ttl: '3600s' // Default 1 hour for mission duration
                }
            });
            this.caches.set(key, {
                name: cache.name || '',
                model,
                expiresAt: Date.now() + 3600000
            });
            (0, LogService_1.pushLog)(`✅ [Cache] 快取建立完成: ${cache.name}`, 'success');
            return cache.name || '';
        }
        catch (e) {
            console.error('[CacheService] Failed to create cache:', e);
            return null;
        }
    }
    /**
     * Clear caches (e.g. on server shutdown)
     */
    async clear() {
        const client = (0, client_1.getAstraClient)(config_1.GEMINI_API_KEY);
        for (const [, entry] of this.caches) {
            try {
                await client.caches.delete({ name: entry.name });
            }
            catch { /* noop */ }
        }
        this.caches.clear();
    }
}
exports.ContextCacheService = ContextCacheService;
exports.contextCacheService = new ContextCacheService();
