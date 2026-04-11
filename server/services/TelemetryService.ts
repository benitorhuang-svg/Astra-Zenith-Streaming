/**
 * 🛰️ TELEMETRY SERVICE (2026 Industrial Edition)
 * Tracks global performance metrics and enforces Rate Limit Budget.
 */
export class TelemetryService {
    private metrics = {
        totalTokens: 0,
        cachedTokens: 0,
        cacheHitRate: 0,
        searchCalls: 0,
        groundingSources: 0, // 🚀 NEW: Transparency Tracking
        estimatedSavings: 0,
        totalRequests: 0
    };

    private rpmHistory: number[] = [];
    private dailyRequestCount: number = 0;
    private lastResetDate: string = new Date().toDateString();

    recordUsage(inputTokens: number, outputTokens: number, cached: number = 0, grounding?: any) {
        this.metrics.totalTokens += (inputTokens + outputTokens);
        this.metrics.cachedTokens += cached;
        this.metrics.totalRequests++;
        this.dailyRequestCount++;
        
        // 🚀 GROUNDING_METRICS_AGGREGATION (2026 SDK Standard)
        if (grounding && grounding.groundingChunks) {
            this.metrics.searchCalls++;
            this.metrics.groundingSources += grounding.groundingChunks.length;
        }
        
        const now = Date.now();
        this.rpmHistory.push(now);
        this.rpmHistory = this.rpmHistory.filter(t => now - t < 60000);

        if (this.metrics.totalTokens > 0) {
            this.metrics.cacheHitRate = Number(((this.metrics.cachedTokens / this.metrics.totalTokens) * 100).toFixed(1));
        }
        this.metrics.estimatedSavings = Number((this.metrics.cachedTokens * 0.000005).toFixed(4));
    }

    /**
     * 🛡️ BUDGET_CHECK: Proactively detect if we are hitting RPM/RPD limits
     * [Limits 2026]: Free tier ~15 RPM, Paid ~2000 RPM
     */
    checkBudget(isPaid: boolean): { ok: boolean, reason?: string, waitMs?: number } {
        const now = Date.now();
        this.rpmHistory = this.rpmHistory.filter(t => now - t < 60000);
        
        const rpmLimit = isPaid ? 1500 : 12; // Leave some buffer (15-3)
        if (this.rpmHistory.length >= rpmLimit) {
            const oldest = this.rpmHistory[0];
            return { ok: false, reason: 'RPM_LIMIT_NEAR', waitMs: 60000 - (now - oldest) };
        }

        const rpdLimit = isPaid ? 100000 : 1400; // Leave buffer (1500-100)
        if (new Date().toDateString() !== this.lastResetDate) {
            this.dailyRequestCount = 0;
            this.lastResetDate = new Date().toDateString();
        }

        if (this.dailyRequestCount >= rpdLimit) {
            return { ok: false, reason: 'RPD_LIMIT_EXHAUSTED', waitMs: 0 };
        }

        return { ok: true };
    }

    recordSearch() { this.metrics.searchCalls++; }
    getMetrics() { return { ...this.metrics, rpm: this.rpmHistory.length, rpd: this.dailyRequestCount }; }
    reset() { this.metrics = { totalTokens: 0, cachedTokens: 0, cacheHitRate: 0, searchCalls: 0, groundingSources: 0, estimatedSavings: 0, totalRequests: 0 }; }
}

export const telemetryService = new TelemetryService();
