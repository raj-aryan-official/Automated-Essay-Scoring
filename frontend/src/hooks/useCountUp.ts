import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

/**
 * Shared count-up animation hook for scores and metrics.
 * Runs over 150-300ms with cubic deceleration (ease-out).
 * Automatically cancels and immediately shows target if prefers-reduced-motion is active.
 */
export function useCountUp(
  target: number,
  minVal: number = 0,
  duration: number = 300
): number {
  const prefersReducedMotion = useReducedMotion();
  const [current, setCurrent] = useState<number>(() => {
    return prefersReducedMotion ? target : minVal;
  });
  const animatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrent(target);
      return;
    }

    if (animatedRef.current && current === target) {
      return;
    }

    animatedRef.current = true;
    let startTime: number | null = null;
    let animationFrameId: number;

    const startVal = Math.min(target, Math.max(0, minVal));
    const endVal = target;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Cubic ease-out: 1 - (1 - progress)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const val = startVal + (endVal - startVal) * easeOut;
      setCurrent(val);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrent(endVal);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [target, minVal, duration, prefersReducedMotion]);

  return current;
}

export default useCountUp;
