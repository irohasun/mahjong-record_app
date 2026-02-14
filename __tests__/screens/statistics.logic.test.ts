import { buildStatsCacheKey } from '@/app/(tabs)/statistics';

describe('buildStatsCacheKey', () => {
  it('returns "all" for "all" period', () => {
    expect(buildStatsCacheKey('all', new Date(2025, 5, 15))).toBe('all');
  });

  it('returns year key for "year" period', () => {
    expect(buildStatsCacheKey('year', new Date(2025, 5, 15))).toBe('year-2025');
  });

  it('returns month key for "month" period', () => {
    expect(buildStatsCacheKey('month', new Date(2025, 0, 15))).toBe('month-2025-1');
    expect(buildStatsCacheKey('month', new Date(2025, 11, 1))).toBe('month-2025-12');
  });
});
