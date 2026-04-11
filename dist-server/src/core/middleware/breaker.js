"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = void 0;
class CircuitBreaker {
    threshold;
    timeout;
    failureCount = 0;
    openedAt = 0;
    state = 'CLOSED';
    constructor(threshold = 5, timeout = 15000) {
        this.threshold = threshold;
        this.timeout = timeout;
    }
    async execute(operation) {
        if (this.state === 'OPEN' && Date.now() - this.openedAt < this.timeout)
            throw new Error('CIRCUIT_OPEN');
        if (this.state === 'OPEN')
            this.state = 'HALF_OPEN';
        try {
            const result = await operation();
            this.state = 'CLOSED';
            this.failureCount = 0;
            return result;
        }
        catch (error) {
            this.failureCount++;
            if (this.failureCount >= this.threshold) {
                this.state = 'OPEN';
                this.openedAt = Date.now();
            }
            throw error;
        }
    }
}
exports.CircuitBreaker = CircuitBreaker;
