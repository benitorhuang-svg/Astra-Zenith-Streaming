import { PortalContext, DIRTY_SIDEBAR } from '../PortalTypes';
import { estimateApproximateTokens } from '../../../core/utils';

/**
 * TelemetryMonitor — Real-time performance and system health synchronization.
 */
export class TelemetryMonitor {
    constructor(private context: PortalContext) {}

    public start() {
        this.poll(3000);
    }

    private async poll(delay: number) {
        await new Promise(r => setTimeout(r, delay));
        try {
            const res = await fetch('/api/telemetry');
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            const p = this.context._p;
            p.telemetryState = {
                ...p.telemetryState,
                cacheHitRate: data.cacheHitRate,
                searchCalls: data.searchCalls,
                estimatedSavings: data.estimatedSavings,
                tokenCount: data.totalTokens
            };

            this.context.scheduleRender(DIRTY_SIDEBAR); 
            setTimeout(() => this.poll(30000), 30000); // Polling every 30s once established
        } catch {
            setTimeout(() => this.poll(Math.min(delay * 2, 60000)), 5000);
        }
    }

    public syncLocalState() {
        const lastMsg = this.context.messages[this.context.messages.length - 1] ?? null;
        const activeMessage = this.context.messages.find(m => m.isStreaming) ?? lastMsg;
        const tokenCount = this.context.messages.reduce((sum, m) => sum + estimateApproximateTokens(m.content), 0);

        const p = this.context._p;
        p.telemetryState = {
            ...p.telemetryState,
            activeAgentCode: activeMessage?.agentCode ?? null,
            activeAgentCount: this.context.messages.filter(m => m.isStreaming).length,
            currentView: this.context.currentView,
            currentPasses: this.context.currentPasses,
            pollingCycles: this.context.pollingCycles,
            tokenCount,
            logCount: p.logs.length,
        };
    }
}
