/**
 * Simple in-process concurrency gate for external API calls.
 * Ensures only `concurrency` external API calls run concurrently.
 */
export class ExternalApiGate {
  private queue: Array<() => void> = [];
  private active = 0;

  constructor(private concurrency = 1) {}

  private dequeue() {
    if (this.active >= this.concurrency) return;
    const next = this.queue.shift();
    if (next) next();
  }

  /**
   * Acquire the gate. Resolves to a release function which MUST be called.
   */
  async acquire(): Promise<() => void> {
    if (this.active < this.concurrency) {
      this.active++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        this.active = Math.max(0, this.active - 1);
        this.dequeue();
      };
    }

    return await new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this.active = Math.max(0, this.active - 1);
          this.dequeue();
        });
      });
    });
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

export const externalApiGate = new ExternalApiGate(4);
