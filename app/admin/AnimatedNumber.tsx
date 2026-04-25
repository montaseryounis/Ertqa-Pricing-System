'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimatedNumber({
  value,
  duration = 900,
}: {
  value: number;
  duration?: number;
}) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reduce = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (reduce) {
      setDisplay(value);
      return;
    }

    const start = performance.now();
    const from = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  return <>{display.toLocaleString('ar-SA')}</>;
}
