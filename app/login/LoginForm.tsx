'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }

      const from = params.get('from') ?? '/';
      router.replace(from);
      router.refresh();
    } catch {
      setError('تعذر الاتصال بالخادم');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="login-form">
      <label className="field">
        <span>كلمة السر</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          required
        />
      </label>

      {error && <div className="login-error">{error}</div>}

      <button type="submit" disabled={loading} className="login-button">
        {loading ? 'جارٍ الدخول...' : 'دخول'}
      </button>
    </form>
  );
}
