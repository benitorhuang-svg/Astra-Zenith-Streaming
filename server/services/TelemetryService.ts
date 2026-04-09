/**
 * 🛰️ TELEMETRY SERVICE (Phase 7)
 * Tracks global performance metrics: Tokens, Cache, and Costs.
 */
export class TelemetryService {
    private metrics = {
        totalTokens: 0,
        cachedTokens: 0,
        cacheHitRate: 0,
        searchCalls: 0,
        estimatedSavings: 0 // In USD
    };

    recordUsage(inputTokens: number, outputTokens: number, cached: number = 0) {
        this.metrics.totalTokens += (inputTokens + outputTokens);
        this.metrics.cachedTokens += cached;
        if (this.metrics.totalTokens > 0) {
            this.metrics.cacheHitRate = Number(((this.metrics.cachedTokens / this.metrics.totalTokens) * 100).toFixed(1));
        }
        // Estimated savings: $5 per 1M tokens (avg for premium models)
        this.metrics.estimatedSavings = Number((this.metrics.cachedTokens * 0.000005).toFixed(4));
    }

    recordSearch() {
        this.metrics.searchCalls++;
    }

    getMetrics() {
        return { ...this.metrics };
    }

    reset() {
        this.metrics = { totalTokens: 0, cachedTokens: 0, cacheHitRate: 0, searchCalls: 0, estimatedSavings: 0 };
    }
}

export const telemetryService = new TelemetryService();
