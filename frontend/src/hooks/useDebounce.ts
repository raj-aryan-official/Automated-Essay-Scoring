import { useState, useEffect } from 'react';

/**
 * useDebounce hook delays updating the debounced value until after `delay` ms
 * have elapsed since the last time the value changed.
 *
 * @param value The value to debounce
 * @param delay Milliseconds to wait before updating
 */
export function useDebounce<T>(value: T, delay: number = 250): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
