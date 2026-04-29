'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  deleteAllConversations,
  type CleanupResult,
} from './actions';

type Props = {
  threadCount: number;
  threadHasMore: boolean;
  rowCount: number;
};

const REQUIRED = 'حذف الكل';

export default function CleanupForm({
  threadCount,
  threadHasMore,
  rowCount,
}: Props) {
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const armed = confirmation.trim() === REQUIRED;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!armed || isPending) return;
    startTransition(async () => {
      const res = await deleteAllConversations(confirmation);
      setResult(res);
      if (res.ok) {
        // Refresh server data so the next visit to /admin shows zero.
        router.refresh();
      }
    });
  };

  if (result?.ok) {
    return (
      <section className="cleanup-result">
        <div className="cleanup-result-icon">✅</div>
        <h2>تم التنظيف بنجاح</h2>
        <ul className="cleanup-result-list">
          <li>
            <strong>{result.threadsDeleted}</strong> محادثة حُذفت من OpenAI
          </li>
          {(result.threadsFailed ?? 0) > 0 && (
            <li className="cleanup-result-warn">
              <strong>{result.threadsFailed}</strong> محادثة فشل حذفها (أعد المحاولة)
            </li>
          )}
          <li>
            <strong>{result.rowsDeleted}</strong> صف حُذف من جدول conversations
          </li>
        </ul>
        <div className="cleanup-result-actions">
          <Link href="/admin" className="cleanup-btn-primary">
            العودة للوحة الأدمن
          </Link>
          {(result.threadsFailed ?? 0) > 0 && (
            <button
              type="button"
              className="cleanup-btn-secondary"
              onClick={() => {
                setResult(null);
                setConfirmation('');
                router.refresh();
              }}
            >
              إعادة المحاولة
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="cleanup-form">
      <div className="cleanup-warning">
        <h2>⚠️ تحذير — عملية لا يمكن التراجع عنها</h2>
        <p>سيتم حذف البيانات التالية بشكل نهائي:</p>
        <ul className="cleanup-counts">
          <li>
            <span className="cleanup-count-num">
              {threadCount}
              {threadHasMore ? '+' : ''}
            </span>
            <span className="cleanup-count-label">محادثة في OpenAI ChatKit</span>
          </li>
          <li>
            <span className="cleanup-count-num">{rowCount}</span>
            <span className="cleanup-count-label">صف في جدول conversations</span>
          </li>
        </ul>
        <p className="cleanup-warning-note">
          ✅ <strong>لن يُحذف:</strong> حسابات Clerk ، جدول users ، إعدادات
          الوكيل في Agent Builder.
        </p>
      </div>

      <label className="field">
        <span>
          اكتب <code className="cleanup-required">{REQUIRED}</code> بالضبط
          للتأكيد
        </span>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          placeholder="حذف الكل"
          className="cleanup-confirm-input"
          autoComplete="off"
          dir="rtl"
        />
      </label>

      {result?.error && (
        <div className="cleanup-error">
          <strong>فشل الحذف:</strong> {result.error}
          {(result.threadsDeleted ?? 0) > 0 && (
            <div>
              تم حذف {result.threadsDeleted} محادثة قبل الفشل.
            </div>
          )}
        </div>
      )}

      <div className="cleanup-actions">
        <Link href="/admin" className="cleanup-btn-secondary">
          إلغاء
        </Link>
        <button
          type="submit"
          disabled={!armed || isPending}
          className="cleanup-btn-danger"
        >
          {isPending ? 'جارٍ الحذف...' : '🗑️ حذف كل المحادثات'}
        </button>
      </div>
    </form>
  );
}
