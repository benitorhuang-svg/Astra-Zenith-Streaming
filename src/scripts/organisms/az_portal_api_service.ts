/**
 * MISSION API SERVICE — Industrial Resilience Layer (OH Pattern)
 * - Implements withRetry & withTimeout middleware logic
 * - Manages mission lifecycle abort signals
 */
import { CircuitBreaker } from '../core/middleware';
import { createAgentPath } from '../core/agents';

export class MissionAPIService {
    private currentAbortController: AbortController | null = null;
    private circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeoutMs: 15000
    });
    
    /**
     * Resilient mission initiation with automated retries
     */
    async initiateMission(topic: string, agents: string[], rounds: number, apiKey?: string, tracePath: string[] = []): Promise<string> {
        this.cancelCurrentMission(); // Clean up previous
        this.currentAbortController = new AbortController();

        const missionTrace = createAgentPath('MISSION', topic, ...tracePath);

        return this.circuitBreaker.execute(async () => {
            let attempts = 0;
            const maxAttempts = 3;
            const timeoutMs = 10000;

            while (attempts < maxAttempts) {
                const timeoutId = setTimeout(() => this.currentAbortController?.abort(), timeoutMs);
                try {
                    console.log(`[API] Attempting Mission Initiation (${attempts + 1}/${maxAttempts})...`);
                    const response = await fetch('/api/initiate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            topic,
                            agent_sequence: agents,
                            apiKey,
                            rounds,
                            tracePath: missionTrace
                        }),
                        signal: this.currentAbortController?.signal
                    });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        const agentsParam = agents.join(',');
                        const keyParam = apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : '';
                        const traceParam = missionTrace.length > 0 ? `&tracePath=${encodeURIComponent(missionTrace.join('>'))}` : '';
                        console.log(`[API] Mission Initiated Successfully. Switching to Stream...`);
                        return `/api/stream?topic=${encodeURIComponent(topic)}&agents=${agentsParam}&rounds=${rounds}${keyParam}${traceParam}&token=${Date.now()}`;
                    }

                    throw new Error(`SERVER_ERROR: ${response.status} ${response.statusText}`);
                } catch (err) {
                    clearTimeout(timeoutId);
                    attempts++;
                    const isAbort = err instanceof Error && err.name === 'AbortError';
                    const errorMsg = err instanceof Error ? err.message : String(err);
                    const readableMsg = isAbort ? `TIMEOUT_EXCEEDED (${timeoutMs}ms)` : errorMsg;

                    console.warn(`[API] Mission Initiation Attempt ${attempts} Failed:`, readableMsg);

                    if (attempts === maxAttempts) {
                        throw new Error(`INDUSTRIAL_FAIL: MISSION_INITIATION_EXHAUSTED after 3 attempts. Last error: ${readableMsg}`, { cause: err });
                    }

                    this.currentAbortController = new AbortController();
                    await new Promise(r => setTimeout(r, 1000 * attempts));
                }
            }

            throw new Error('UNKNOWN_FAILURE');
        });
    }

    /**
     * Specialized summary stream URL generator
     */
    async initiateA6Summary(topic: string, isVisualMode: boolean, apiKey?: string): Promise<string> {
        const visualTag = isVisualMode ? ' [VISUALIZE]' : '';
        const keyParam = apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : '';
        return `/api/stream?topic=${encodeURIComponent(topic + visualTag)}&agents=A6&rounds=1&mode=final_summary${keyParam}`;
    }

    /**
     * System-wide log monitoring
     */
    listenToSystemLogs(onLog: (data: unknown) => void): EventSource {
        const ev = new EventSource('/api/logs');
        ev.onmessage = (event) => {
            try {
                const data: unknown = JSON.parse(event.data);
                onLog(data);
            } catch { /* silent log parse fail */ }
        };
        return ev;
    }

    cancelCurrentMission() {
        if (this.currentAbortController) {
            this.currentAbortController.abort();
            this.currentAbortController = null;
        }
    }

    closeCurrentStream() {
        this.cancelCurrentMission();
    }
}
