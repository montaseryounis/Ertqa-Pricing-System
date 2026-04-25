'use client';

import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

type Props = {
  href: string;
  className?: string;
  isActive?: boolean;
  children: ReactNode;
};

export default function TeamCard({
  href,
  className = '',
  isActive = false,
  children,
}: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      href={href}
      className={`team-card ${isActive ? 'team-card-active' : ''} ${className}`.trim()}
      onMouseMove={(event) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const xPct = (x / rect.width) * 100;
        const yPct = (y / rect.height) * 100;
        // Tilt range: ~6deg max in either direction.
        const rotX = (y / rect.height - 0.5) * -6;
        const rotY = (x / rect.width - 0.5) * 6;
        el.style.setProperty('--mx', `${xPct}%`);
        el.style.setProperty('--my', `${yPct}%`);
        el.style.setProperty('--rx', `${rotX.toFixed(2)}deg`);
        el.style.setProperty('--ry', `${rotY.toFixed(2)}deg`);
      }}
      onMouseLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      }}
    >
      {children}
    </Link>
  );
}
