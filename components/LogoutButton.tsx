'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();
  const [name, setName] = useState<string>('');

  useEffect(() => {
    const match = document.cookie
      .split('; ')
      .find((c) => c.startsWith('ertqa_user='));
    if (match) {
      try {
        setName(decodeURIComponent(match.split('=')[1]));
      } catch {
        // malformed cookie, ignore
      }
    }
  }, []);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  return (
    <div className="user-menu">
      {name && <span className="user-name">{name}</span>}
      <button
        type="button"
        onClick={logout}
        className="logout-button"
        aria-label="تسجيل الخروج"
        title="تسجيل الخروج"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      </button>
    </div>
  );
}
