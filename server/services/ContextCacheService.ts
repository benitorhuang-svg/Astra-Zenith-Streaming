import { getAstraClient } from '../core/client';
import { isPaidTier, GEMINI_API_KEY } from '../core/config';
import { pushLog } from './LogService';

export interface CacheEntry {
    name: string;
    model: string;
    expiresAt: number;
}

/**
 * 🛰️ CONTEXT CACHE SERVICE (Gemini Cookbook)
 * Manages explicit caches for Paid Tier users to reduce costs and latency.
 */
export class ContextCacheService {
    private caches: Map<string, CacheEntry> = new Map();

    /**
     * Create or retrieve a cache for the given content
     */
    async getOrCreateCache(key: string, model: string, systemInstruction: string, content: string): Promise<string | null> {
        if (!isPaidTier || !GEMINI_API_KEY) return null;

        const existing = this.caches.get(key);
        if (existing && existing.expiresAt > Date.now()) {
            return existing.name;
        }

        try {
            const client = getAstraClient(GEMINI_API_KEY);
            pushLog(`📦 [Cache] 正在為 Paid Tier 建立快取實體... (v1beta版)`, 'warn');

            // 🚀 Unified SDK 2026: client.cachedContents.create
            const cache = await (client as any).cachedContents.create({
                model,
                displayName: `AZ_Cache_${key.slice(0, 8)}`,
                systemInstruction: { parts: [{ text: systemInstruction }] },
                contents: [{ role: 'user', parts: [{ text: content }] }],
                ttl: '3600s' // Default 1 hour for mission duration
            });

            this.caches.set(key, {
                name: cache.name || '',
                model,
                expiresAt: Date.now() + 3600000
            });

            pushLog(`✅ [Cache] 快取建立完成: ${cache.name}`, 'success');
            return cache.name || '';
        } catch (e) {
            console.error('[CacheService] Failed to create cache:', e);
            return null;
        }
    }

    /**
     * Clear caches (e.g. on server shutdown)
     */
    async clear() {
        const client = getAstraClient(GEMINI_API_KEY);
        for (const [, entry] of this.caches) {
            try {
                await client.caches.delete({ name: entry.name });
            } catch { /* noop */ }
        }
        this.caches.clear();
    }
}

export const contextCacheService = new ContextCacheService();
