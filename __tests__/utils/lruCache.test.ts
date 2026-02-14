import { LRUCache } from '@/utils/lruCache';

describe('LRUCache', () => {
  it('stores and retrieves values', () => {
    const cache = new LRUCache<string, number>(10);
    cache.set('a', 1);
    cache.set('b', 2);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBe(2);
  });

  it('returns undefined for missing keys', () => {
    const cache = new LRUCache<string, number>(10);
    expect(cache.get('missing')).toBeUndefined();
  });

  it('evicts the oldest entry when maxSize is exceeded', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Cache is full, adding 'd' should evict 'a'
    cache.set('d', 4);

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('updates LRU order on get (accessed entry is not evicted)', () => {
    const cache = new LRUCache<string, number>(3);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);

    // Access 'a' to make it recently used
    cache.get('a');

    // Adding 'd' should evict 'b' (oldest non-accessed)
    cache.set('d', 4);

    expect(cache.get('a')).toBe(1);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe(3);
    expect(cache.get('d')).toBe(4);
  });

  it('clears all entries', () => {
    const cache = new LRUCache<string, number>(10);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.clear();

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });

  it('overwrites existing key without increasing size', () => {
    const cache = new LRUCache<string, number>(2);
    cache.set('a', 1);
    cache.set('b', 2);

    // Overwrite 'a' — should not evict anything
    cache.set('a', 10);

    expect(cache.get('a')).toBe(10);
    expect(cache.get('b')).toBe(2);
  });
});
