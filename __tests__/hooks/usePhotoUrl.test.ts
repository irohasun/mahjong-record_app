import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePhotoUrl, clearPhotoUrlCache } from '@/hooks/usePhotoUrl';
import { StorageService } from '@/services/StorageService';

jest.mock('@/services/StorageService', () => ({
  StorageService: {
    getPublicUrl: jest.fn(),
  },
}));

const mockGetPublicUrl = StorageService.getPublicUrl as jest.Mock;

describe('usePhotoUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearPhotoUrlCache();
  });

  it('returns null when photoPath is undefined', () => {
    const { result } = renderHook(() => usePhotoUrl(undefined));
    expect(result.current).toBeNull();
  });

  it('fetches and returns URL for a valid path', async () => {
    mockGetPublicUrl.mockResolvedValue('https://example.com/photo.jpg');

    const { result } = renderHook(() => usePhotoUrl('photos/test.jpg'));

    await waitFor(() => {
      expect(result.current).toBe('https://example.com/photo.jpg');
    });

    expect(mockGetPublicUrl).toHaveBeenCalledWith('photos/test.jpg');
  });

  it('returns cached URL without re-fetching', async () => {
    mockGetPublicUrl.mockResolvedValue('https://example.com/photo.jpg');

    const { result: result1 } = renderHook(() => usePhotoUrl('photos/test.jpg'));
    await waitFor(() => {
      expect(result1.current).toBe('https://example.com/photo.jpg');
    });

    // Reset mock call count
    mockGetPublicUrl.mockClear();

    const { result: result2 } = renderHook(() => usePhotoUrl('photos/test.jpg'));

    // Should be available immediately from cache
    expect(result2.current).toBe('https://example.com/photo.jpg');
    expect(mockGetPublicUrl).not.toHaveBeenCalled();
  });
});
