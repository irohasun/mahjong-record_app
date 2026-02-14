/**
 * Simple LRU (Least Recently Used) cache using Map iteration order.
 *
 * Map preserves insertion order; deleting and re-inserting a key moves it
 * to the end, so the first key is always the least recently used.
 */
export class LRUCache<K, V> {
  private readonly maxSize: number;
  private readonly map: Map<K, V>;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value === undefined) return undefined;

    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    // If the key already exists, delete it first so the new insert goes to the end
    if (this.map.has(key)) {
      this.map.delete(key);
    }

    this.map.set(key, value);

    // Evict the oldest entry if over capacity
    if (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) {
        this.map.delete(oldest);
      }
    }
  }

  clear(): void {
    this.map.clear();
  }
}
