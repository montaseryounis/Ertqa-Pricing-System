'use client';

import { useEffect, useState } from 'react';

type Props = {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
};

// Reveals `text` one character at a time. Respects prefers-reduced-motion.
export default function TypewriterTitle({
  text,
  speed = 90,
  startDelay = 200,
  className = '',
}: Props) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) {
      setDisplayed(text);
      setDone(true);
      return;
    }

    setDisplayed('');
    setDone(false);

    let index = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const advance = () => {
      index++;
      setDisplayed(text.slice(0, index));
      if (index < text.length) {
        timer = setTimeout(advance, speed);
      } else {
        setDone(true);
      }
    };

    timer = setTimeout(advance, startDelay);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [text, speed, startDelay]);

  return (
    <span className={className}>
      <span aria-label={text}>{displayed}</span>
      <span
        className={`typewriter-cursor ${done ? 'typewriter-cursor-done' : ''}`}
        aria-hidden="true"
      >
        |
      </span>
    </span>
  );
}
