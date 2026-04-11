"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.externalApiGate = exports.ExternalApiGate = void 0;
/**
 * Simple in-process concurrency gate for external API calls.
 * Ensures only `concurrency` external API calls run concurrently.
 */
class ExternalApiGate {
    concurrency;
    queue = [];
    active = 0;
    constructor(concurrency = 1) {
        this.concurrency = concurrency;
    }
    dequeue() {
        if (this.active >= this.concurrency)
            return;
        const next = this.queue.shift();
        if (next)
            next();
    }
    /**
     * Acquire the gate. Resolves to a release function which MUST be called.
     */
    async acquire() {
        if (this.active < this.concurrency) {
            this.active++;
            let released = false;
            return () => {
                if (released)
                    return;
                released = true;
                this.active = Math.max(0, this.active - 1);
                this.dequeue();
            };
        }
        return await new Promise((resolve) => {
            this.queue.push(() => {
                this.active++;
                let released = false;
                resolve(() => {
                    if (released)
                        return;
                    released = true;
                    this.active = Math.max(0, this.active - 1);
                    this.dequeue();
                });
            });
        });
    }
    async runExclusive(fn) {
        const release = await this.acquire();
        try {
            return await fn();
        }
        finally {
            release();
        }
    }
}
exports.ExternalApiGate = ExternalApiGate;
exports.externalApiGate = new ExternalApiGate(4);
