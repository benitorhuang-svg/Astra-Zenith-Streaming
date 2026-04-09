import { PortalContext, DIRTY_SIDEBAR } from '../../az_portal';
import { estimateApproximateTokens } from '../../../core/utils';

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
            
            this.context._p.telemetryState = {
                ...this.context._p.telemetryState,
                cacheHitRate: data.cacheHitRate,
                searchCalls: data.searchCalls,
                estimatedSavings: data.estimatedSavings,
                tokenCount: data.totalTokens
            };

            this.context.scheduleRender(DIRTY_SIDEBAR); 
            setTimeout(() => this.poll(5000), 5000);
        } catch {
            setTimeout(() => this.poll(Math.min(delay * 2, 10000)), 2000);
        }
    }

    public syncLocalState() {
        const activeMessage = this.context.messages.find(m => m.isStreaming) ?? this.context.messages[this.context.messages.length - 1] ?? null;
        const tokenCount = this.context.messages.reduce((sum, m) => sum + estimateApproximateTokens(m.content), 0);

        this.context._p.telemetryState = {
            ...this.context._p.telemetryState,
            activeAgentCode: activeMessage?.agentCode ?? null,
            activeAgentCount: this.context.messages.filter(m => m.isStreaming).length,
            currentView: this.context.currentView,
            currentPasses: this.context.currentPasses,
            pollingCycles: this.context.pollingCycles,
            tokenCount,
            logCount: this.context._p.logs.length,
        };
    }
}
