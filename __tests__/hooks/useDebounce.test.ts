import { renderHook, act } from '@testing-library/react-native';
import { useDebounce } from '@/hooks/useDebounce';

jest.useFakeTimers();

describe('useDebounce', () => {
  it('returns initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('hello', 300));
    expect(result.current).toBe('hello');
  });

  it('does not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });

    // Before timer fires, value should still be 'hello'
    expect(result.current).toBe('hello');
  });

  it('updates value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'hello' } }
    );

    rerender({ value: 'world' });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current).toBe('world');
  });

  it('resets timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } }
    );

    rerender({ value: 'b' });
    act(() => { jest.advanceTimersByTime(100); });

    rerender({ value: 'c' });
    act(() => { jest.advanceTimersByTime(100); });

    rerender({ value: 'd' });

    // Only 200ms passed since last change, should still be 'a'
    expect(result.current).toBe('a');

    act(() => { jest.advanceTimersByTime(300); });

    // Now it should be 'd' (the final value)
    expect(result.current).toBe('d');
  });
});
