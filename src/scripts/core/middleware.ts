import type { MissionMessage, PipelineContext } from './types';
import { estimateTokenCount } from './types';

export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitterRatio?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
    onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export interface TokenGuardOptions {
    maxTokens?: number;
    keepLatestMessages?: number;
    summaryLabel?: string;
}

export interface TurnTrackingOptions {
    maxTurns?: number;
    onLimitReached?: (turnCount: number, maxTurns: number) => void;
}

export interface AuditOptions {
    label?: string;
    detail?: string;
}

export type Middleware<T extends PipelineContext = PipelineContext> = (context: T, next: () => Promise<void>) => Promise<void>;
export type FinalHandler<T extends PipelineContext = PipelineContext> = (context: T) => Promise<void>;

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
        return /(429|503|timeout|abort|CIRCUIT_OPEN|network)/i.test(error.message);
    }

    return false;
}

export function composeMiddlewares<T extends PipelineContext>(
    middlewares: Middleware<T>[],
    finalHandler: FinalHandler<T>
): FinalHandler<T> {
    return async (context: T) => {
        let index = -1;

        const dispatch = async (currentIndex: number): Promise<void> => {
            if (currentIndex <= index) {
                throw new Error('MIDDLEWARE_NEXT_CALLED_MULTIPLE_TIMES');
            }

            index = currentIndex;
            const middleware = middlewares[currentIndex];

            if (!middleware) {
                await finalHandler(context);
                return;
            }

            await middleware(context, () => dispatch(currentIndex + 1));
        };

        await dispatch(0);
    };
}

export const withRetry = <T extends PipelineContext>(options: RetryOptions = {}): Middleware<T> => {
    const {
        maxAttempts = 3,
        baseDelayMs = 750,
        maxDelayMs = 8000,
        jitterRatio = 0.3,
        shouldRetry = isRetryableError
    } = options;

    return async (context, next) => {
        let attempt = 0;

        while (attempt < maxAttempts) {
            try {
                context.retryCount = attempt;
                await next();
                return;
            } catch (error) {
                attempt += 1;

                const retryable = shouldRetry(error, attempt);
                if (!retryable || attempt >= maxAttempts) {
                    throw error;
                }

                const rawDelay = Math.min(maxDelayMs, baseDelayMs * attempt * attempt);
                const jitter = rawDelay * jitterRatio * Math.random();
                const delayMs = Math.round(rawDelay + jitter);

                context.retryCount = attempt;
                context.recordLog?.(
                    `Retry ${attempt}/${maxAttempts} scheduled in ${delayMs}ms`,
                    'WARNING'
                );
                options.onRetry?.(error, attempt, delayMs);
                await sleep(delayMs);
            }
        }
    };
};

function compactMessages(messages: MissionMessage[], maxTokens: number, keepLatestMessages: number): {
    messages: MissionMessage[];
    tokenEstimate: number;
    isCompacting: boolean;
    summary: string;
} {
    const totalTokens = messages.reduce((sum, message) => sum + estimateTokenCount(message.content), 0);
    if (totalTokens <= maxTokens) {
        return {
            messages,
            tokenEstimate: totalTokens,
            isCompacting: false,
            summary: ''
        };
    }

    const keepCount = Math.max(keepLatestMessages, 2);
    const preserved = messages.slice(-keepCount);
    const prunedCount = Math.max(0, messages.length - preserved.length);
    const prunedTokens = messages
        .slice(0, messages.length - preserved.length)
        .reduce((sum, message) => sum + estimateTokenCount(message.content), 0);

    const summaryMessage: MissionMessage = {
        agentCode: 'SYSTEM',
        agentName: 'SYSTEM',
        agentColor: 'rgba(255,255,255,0.35)',
        agentImg: 'avatar_cute_robot.png',
        content: `[pruned ${prunedCount} messages | approx ${prunedTokens} tokens]`,
        round: preserved.length > 0 ? preserved[0].round : 0,
        isStreaming: false,
        path: ['SYSTEM', 'CONTEXT_COMPACTION'],
        summary: 'Context compacted before dispatch'
    };

    const nextMessages = [summaryMessage, ...preserved];
    const nextTokens = nextMessages.reduce((sum, message) => sum + estimateTokenCount(message.content), 0);

    return {
        messages: nextMessages,
        tokenEstimate: nextTokens,
        isCompacting: true,
        summary: summaryMessage.content
    };
}

export const withTokenGuard = <T extends PipelineContext>(options: TokenGuardOptions = {}): Middleware<T> => {
    const {
        maxTokens = 8000,
        keepLatestMessages = 10,
        summaryLabel = 'Context compaction'
    } = options;

    return async (context, next) => {
        const compacted = compactMessages(context.messages, maxTokens, keepLatestMessages);

        context.tokenEstimate = compacted.tokenEstimate;
        context.isCompacting = compacted.isCompacting;

        if (compacted.isCompacting) {
            context.messages.splice(0, context.messages.length, ...compacted.messages);
            context.recordLog?.(`${summaryLabel}: ${compacted.summary}`, 'WARN');
            context.recordTelemetry?.('compactionSummary', compacted.summary);
        }

        await next();
    };
};

export const withTurnTracking = <T extends PipelineContext>(options: TurnTrackingOptions = {}): Middleware<T> => {
    const {
        maxTurns = 5,
        onLimitReached
    } = options;

    return async (context, next) => {
        const nextTurn = context.turnCount + 1;
        if (nextTurn > maxTurns) {
            onLimitReached?.(nextTurn, maxTurns);
            throw new Error(`TURN_LIMIT_EXCEEDED: ${nextTurn}/${maxTurns}`);
        }

        context.turnCount = nextTurn;
        await next();
    };
};

export const withAuditLog = <T extends PipelineContext>(options: AuditOptions = {}): Middleware<T> => {
    const label = options.label ?? 'MISSION';

    return async (context, next) => {
        const startedAt = new Date().toISOString();
        const entry = `[${startedAt}] ${label}${options.detail ? ` :: ${options.detail}` : ''}`;
        context.auditTrail.push(entry);
        context.persistAuditTrail?.(context.auditTrail);
        context.recordLog?.(entry, 'INFO');

        try {
            await next();
        } finally {
            const finishedAt = new Date().toISOString();
            context.auditTrail.push(`[${finishedAt}] ${label} COMPLETE`);
            context.persistAuditTrail?.(context.auditTrail);
        }
    };
};

export class CircuitBreaker {
    private failureCount = 0;
    private openedAt = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private readonly options: {
            failureThreshold?: number;
            resetTimeoutMs?: number;
            onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void;
        } = {}
    ) {}

    private get failureThreshold(): number {
        return this.options.failureThreshold ?? 5;
    }

    private get resetTimeoutMs(): number {
        return this.options.resetTimeoutMs ?? 15000;
    }

    private setState(nextState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
        if (this.state === nextState) return;
        this.state = nextState;
        this.options.onStateChange?.(nextState);
    }

    private canAttempt(): boolean {
        if (this.state === 'CLOSED') return true;
        if (this.state === 'HALF_OPEN') return true;

        if (Date.now() - this.openedAt >= this.resetTimeoutMs) {
            this.setState('HALF_OPEN');
            return true;
        }

        return false;
    }

    private recordSuccess(): void {
        this.failureCount = 0;
        this.openedAt = 0;
        this.setState('CLOSED');
    }

    private recordFailure(): void {
        this.failureCount += 1;
        if (this.failureCount >= this.failureThreshold) {
            this.openedAt = Date.now();
            this.setState('OPEN');
        }
    }

    public async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (!this.canAttempt()) {
            throw new Error('CIRCUIT_OPEN');
        }

        try {
            const result = await operation();
            this.recordSuccess();
            return result;
        } catch (error) {
            this.recordFailure();
            throw error;
        }
    }

    public getStatus(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
        return this.state;
    }
}

