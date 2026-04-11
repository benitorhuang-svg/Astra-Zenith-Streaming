import { PipelineContext } from '../types';

export interface RetryOptions {
    maxAttempts?: number;
    baseDelayMs?: number;
    shouldRetry?: (err: unknown) => boolean;
}

export const withRetry = (options: RetryOptions = {}) => {
    const { maxAttempts = 3, baseDelayMs = 750, shouldRetry = () => true } = options;
    return async (context: PipelineContext, next: () => Promise<void>) => {
        let attempt = 0;
        while (attempt < maxAttempts) {
            try {
                await next();
                return;
            } catch (err) {
                attempt++;
                if (attempt >= maxAttempts || !shouldRetry(err)) throw err;
                const delay = Math.min(8000, baseDelayMs * attempt * attempt);
                context.recordLog?.(`Retry ${attempt}/${maxAttempts} in ${delay}ms`, 'WARNING');
                await new Promise(r => setTimeout(r, delay));
            }
        }
    };
};
