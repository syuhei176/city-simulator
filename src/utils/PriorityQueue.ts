/**
 * Priority Queue implementation for A* algorithm
 */

interface QueueItem<T> {
  value: T;
  priority: number;
}

export class PriorityQueue<T> {
  private items: QueueItem<T>[] = [];

  /**
   * Add item with priority
   */
  enqueue(value: T, priority: number): void {
    const item = { value, priority };

    // Insert in sorted order
    let added = false;
    for (let i = 0; i < this.items.length; i++) {
      if (priority < this.items[i].priority) {
        this.items.splice(i, 0, item);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(item);
    }
  }

  /**
   * Remove and return item with lowest priority
   */
  dequeue(): T | undefined {
    const item = this.items.shift();
    return item?.value;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.items.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.items = [];
  }
}
