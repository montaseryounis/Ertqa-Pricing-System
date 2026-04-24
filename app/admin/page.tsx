import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';
import { listThreads, parseUserId, type ThreadSummary } from '@/lib/openai';

export const dynamic = 'force-dynamic';

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusLabel(status: ThreadSummary['status']): string {
  if (status.type === 'active') return 'نشطة';
  if (status.type === 'locked') return 'مقفلة';
  return 'مغلقة';
}

function startOfDayIso(offsetDays = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

export default async function AdminPage() {
  const supabase = createAdminClient();

  let threads: ThreadSummary[] = [];
  let threadsError: string | null = null;
  try {
    const res = await listThreads({ limit: 100, order: 'desc' });
    threads = res.data;
  } catch (error) {
    threadsError = error instanceof Error ? error.message : 'Unknown error';
  }

  const userIds = Array.from(
    new Set(
      threads
        .map((t) => parseUserId(t.user))
        .filter((id): id is string => Boolean(id))
    )
  );
  const { data: users } = userIds.length
    ? await supabase
        .from('users')
        .select('id, email, full_name, role')
        .in('id', userIds)
    : { data: [] };
  const userMap = new Map(
    (users ?? []).map(
      (u: {
        id: string;
        email: string;
        full_name: string | null;
        role: string;
      }) => [u.id, u]
    )
  );

  const [
    { count: totalConversations },
    { count: uniqueUsers },
    { count: todayCount },
    { count: weekCount },
  ] = await Promise.all([
    supabase.from('conversations').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', startOfDayIso(0)),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', startOfDayIso(6)),
  ]);

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-title">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="ارتقاء"
            className="brand-logo"
            width={24}
            height={30}
          />
          <h1>لوحة الأدمن</h1>
        </div>
        <div className="admin-header-actions">
          <Link href="/" className="admin-link">
            → العودة للوكيل
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <section className="admin-stats" aria-label="إحصائيات">
        <div className="stat">
          <div className="stat-value">{totalConversations ?? 0}</div>
          <div className="stat-label">إجمالي الجلسات</div>
        </div>
        <div className="stat">
          <div className="stat-value">{uniqueUsers ?? 0}</div>
          <div className="stat-label">الموظفون</div>
        </div>
        <div className="stat">
          <div className="stat-value">{weekCount ?? 0}</div>
          <div className="stat-label">آخر 7 أيام</div>
        </div>
        <div className="stat">
          <div className="stat-value">{todayCount ?? 0}</div>
          <div className="stat-label">اليوم</div>
        </div>
      </section>

      <section className="admin-table-wrap">
        <div className="admin-table-header">
          <h2>المحادثات</h2>
          <span className="admin-subtle">
            {threadsError
              ? `فشل تحميل المحادثات: ${threadsError}`
              : `تعرض ${threads.length} محادثة (الحد الأقصى 100)`}
          </span>
        </div>
        {threads.length === 0 && !threadsError ? (
          <div className="admin-empty">
            لا توجد محادثات فعلية بعد. ابدأ محادثة من الصفحة الرئيسية.
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الموظف</th>
                  <th>الإيميل</th>
                  <th>العنوان</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {threads.map((t) => {
                  const userId = parseUserId(t.user);
                  const user = userId ? userMap.get(userId) : undefined;
                  return (
                    <tr key={t.id}>
                      <td>{formatDate(t.created_at)}</td>
                      <td>{user?.full_name ?? '—'}</td>
                      <td className="admin-email">{user?.email ?? t.user}</td>
                      <td>{t.title ?? '—'}</td>
                      <td>
                        <span className={`role-badge role-${t.status.type}`}>
                          {statusLabel(t.status)}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/admin/thread/${t.id}`}
                          className="admin-view-btn"
                        >
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
