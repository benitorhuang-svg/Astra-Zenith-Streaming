"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = void 0;
const withRetry = (options = {}) => {
    const { maxAttempts = 3, baseDelayMs = 750, shouldRetry = () => true } = options;
    return async (context, next) => {
        let attempt = 0;
        while (attempt < maxAttempts) {
            try {
                await next();
                return;
            }
            catch (err) {
                attempt++;
                if (attempt >= maxAttempts || !shouldRetry(err))
                    throw err;
                const delay = Math.min(8000, baseDelayMs * attempt * attempt);
                context.recordLog?.(`Retry ${attempt}/${maxAttempts} in ${delay}ms`, 'WARNING');
                await new Promise(r => setTimeout(r, delay));
            }
        }
    };
};
exports.withRetry = withRetry;
