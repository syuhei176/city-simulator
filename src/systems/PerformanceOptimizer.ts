/**
 * Performance optimization utilities
 */
export class PerformanceOptimizer {
  private static fpsHistory: number[] = [];
  private static lastFrameTime: number = 0;

  /**
   * Measure FPS
   */
  static measureFPS(): number {
    const now = performance.now();
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = now;
      return 0;
    }

    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (delta > 0) {
      const fps = 1000 / delta;
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }
      return fps;
    }

    return 0;
  }

  /**
   * Get average FPS
   */
  static getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * Check if performance is degraded
   */
  static isPerformanceDegraded(): boolean {
    const avgFPS = this.getAverageFPS();
    return avgFPS > 0 && avgFPS < 30;
  }

  /**
   * Throttle function execution
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0;
    return function (this: any, ...args: Parameters<T>) {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func.apply(this, args);
      }
    };
  }

  /**
   * Debounce function execution
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: number | undefined;
    return function (this: any, ...args: Parameters<T>) {
      clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        func.apply(this, args);
      }, delay);
    };
  }

  /**
   * Batch process large arrays
   */
  static async batchProcess<T>(
    items: T[],
    processFunc: (item: T) => void,
    batchSize: number = 100,
    delayMs: number = 0
  ): Promise<void> {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      batch.forEach(processFunc);

      if (delayMs > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Object pool for reusing objects
   */
  static createObjectPool<T>(
    factory: () => T,
    reset: (obj: T) => void,
    initialSize: number = 10
  ) {
    const pool: T[] = [];

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      pool.push(factory());
    }

    return {
      acquire(): T {
        if (pool.length > 0) {
          return pool.pop()!;
        }
        return factory();
      },
      release(obj: T): void {
        reset(obj);
        pool.push(obj);
      },
      size(): number {
        return pool.length;
      },
    };
  }

  /**
   * Spatial hash grid for efficient collision detection
   */
  static createSpatialHash<T extends { x: number; y: number }>(cellSize: number) {
    const grid = new Map<string, T[]>();

    const getKey = (x: number, y: number): string => {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      return `${cx},${cy}`;
    };

    return {
      insert(item: T): void {
        const key = getKey(item.x, item.y);
        if (!grid.has(key)) {
          grid.set(key, []);
        }
        grid.get(key)!.push(item);
      },
      query(x: number, y: number, radius: number): T[] {
        const results: T[] = [];
        const minX = x - radius;
        const maxX = x + radius;
        const minY = y - radius;
        const maxY = y + radius;

        const minCX = Math.floor(minX / cellSize);
        const maxCX = Math.floor(maxX / cellSize);
        const minCY = Math.floor(minY / cellSize);
        const maxCY = Math.floor(maxY / cellSize);

        for (let cy = minCY; cy <= maxCY; cy++) {
          for (let cx = minCX; cx <= maxCX; cx++) {
            const key = `${cx},${cy}`;
            const items = grid.get(key);
            if (items) {
              results.push(...items);
            }
          }
        }

        return results;
      },
      clear(): void {
        grid.clear();
      },
    };
  }

  /**
   * Get memory usage (if available)
   */
  static getMemoryUsage(): { used: number; total: number } | null {
    if ('memory' in performance && (performance as any).memory) {
      const mem = (performance as any).memory;
      return {
        used: mem.usedJSHeapSize,
        total: mem.totalJSHeapSize,
      };
    }
    return null;
  }

  /**
   * Reset performance tracking
   */
  static reset(): void {
    this.fpsHistory = [];
    this.lastFrameTime = 0;
  }
}
