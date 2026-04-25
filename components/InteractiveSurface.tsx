'use client';

import { useRef, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  tilt?: number;
  ariaLabel?: string;
};

// Generic interactive surface. Tracks pointer position and writes
// CSS variables --mx/--my (spotlight) plus optional --rx/--ry (tilt)
// onto a div wrapper. Use for any surface that should react to the
// cursor (chat panel, stat cards, thread meta, etc.).
export default function InteractiveSurface({
  children,
  className = '',
  tilt = 0,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className={className}
      aria-label={ariaLabel}
      onMouseMove={(event) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        el.style.setProperty('--mx', `${(x / rect.width) * 100}%`);
        el.style.setProperty('--my', `${(y / rect.height) * 100}%`);
        if (tilt > 0) {
          const rx = (y / rect.height - 0.5) * -tilt;
          const ry = (x / rect.width - 0.5) * tilt;
          el.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
          el.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        }
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el || tilt <= 0) return;
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      }}
    >
      {children}
    </div>
  );
}
