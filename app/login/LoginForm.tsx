'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Props = {
  teamNames: string[];
};

export default function LoginForm({ teamNames }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name) {
      setError('اختر اسمك من القائمة');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password }),
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
        <span>الاسم</span>
        <select
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        >
          <option value="">اختر اسمك</option>
          {teamNames.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>كلمة السر المشتركة</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
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
