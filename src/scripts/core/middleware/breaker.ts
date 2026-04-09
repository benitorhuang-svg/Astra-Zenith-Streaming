export class CircuitBreaker {
    private failureCount = 0;
    private openedAt = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(private readonly threshold = 5, private readonly timeout = 15000) {}

    public async execute<T>(operation: () => Promise<T>): Promise<T> {
        if (this.state === 'OPEN' && Date.now() - this.openedAt < this.timeout) throw new Error('CIRCUIT_OPEN');
        if (this.state === 'OPEN') this.state = 'HALF_OPEN';

        try {
            const result = await operation();
            this.state = 'CLOSED';
            this.failureCount = 0;
            return result;
        } catch (error) {
            this.failureCount++;
            if (this.failureCount >= this.threshold) {
                this.state = 'OPEN';
                this.openedAt = Date.now();
            }
            throw error;
        }
    }
}
