import { buildStatsCacheKey } from '@/app/(tabs)/statistics';

describe('buildStatsCacheKey', () => {
  it('returns player-count suffixed key for "all" period', () => {
    expect(buildStatsCacheKey('all', new Date(2025, 5, 15), 4)).toBe('all-4p');
    expect(buildStatsCacheKey('all', new Date(2025, 5, 15), 3)).toBe('all-3p');
  });

  it('returns player-count suffixed key for "year" period', () => {
    expect(buildStatsCacheKey('year', new Date(2025, 5, 15), 4)).toBe('year-2025-4p');
    expect(buildStatsCacheKey('year', new Date(2025, 5, 15), 3)).toBe('year-2025-3p');
  });

  it('returns player-count suffixed key for "month" period', () => {
    expect(buildStatsCacheKey('month', new Date(2025, 0, 15), 4)).toBe('month-2025-1-4p');
    expect(buildStatsCacheKey('month', new Date(2025, 11, 1), 4)).toBe('month-2025-12-4p');
  });
});
