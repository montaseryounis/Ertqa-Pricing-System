import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';
import { listThreads, parseUserId, type ThreadSummary } from '@/lib/openai';

export const dynamic = 'force-dynamic';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type UserCardData = UserRow & {
  count: number;
  lastActivity: number | undefined;
};

function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function relativeTime(unixSeconds: number | undefined): string {
  if (!unixSeconds) return 'لم يبدأ بعد';
  const diffSec = Date.now() / 1000 - unixSeconds;
  if (diffSec < 60) return 'الآن';
  if (diffSec < 3600) return `منذ ${Math.floor(diffSec / 60)} دقيقة`;
  if (diffSec < 86400) return `منذ ${Math.floor(diffSec / 3600)} ساعة`;
  if (diffSec < 604800) return `منذ ${Math.floor(diffSec / 86400)} يوم`;
  return new Date(unixSeconds * 1000).toLocaleDateString('ar-SA', {
    dateStyle: 'medium',
  });
}

function isActiveToday(unixSeconds: number | undefined): boolean {
  if (!unixSeconds) return false;
  return Date.now() / 1000 - unixSeconds < 86400;
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

function initial(name: string | null, fallback: string): string {
  const source = (name && name.trim()) || fallback;
  return source.slice(0, 1).toUpperCase();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const { user: selectedUserId } = await searchParams;

  const supabase = createAdminClient();

  let allThreads: ThreadSummary[] = [];
  let threadsError: string | null = null;
  try {
    const res = await listThreads({ limit: 100, order: 'desc' });
    allThreads = res.data;
  } catch (error) {
    threadsError = error instanceof Error ? error.message : 'Unknown error';
  }

  const { data: usersData } = await supabase
    .from('users')
    .select('id, email, full_name, role');
  const users = (usersData ?? []) as UserRow[];

  const threadsByUser = new Map<string, ThreadSummary[]>();
  for (const t of allThreads) {
    const uid = parseUserId(t.user);
    if (!uid) continue;
    const list = threadsByUser.get(uid);
    if (list) list.push(t);
    else threadsByUser.set(uid, [t]);
  }

  const userCards: UserCardData[] = users
    .map((u) => {
      const userThreads = threadsByUser.get(u.id) ?? [];
      return {
        ...u,
        count: userThreads.length,
        lastActivity: userThreads[0]?.created_at,
      };
    })
    .sort((a, b) => {
      const aTime = a.lastActivity ?? 0;
      const bTime = b.lastActivity ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
    });

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  const visibleThreads = selectedUserId
    ? allThreads.filter((t) => parseUserId(t.user) === selectedUserId)
    : allThreads;

  const userMap = new Map(users.map((u) => [u.id, u]));

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

      <section className="team-section" aria-label="الفريق">
        <div className="team-section-header">
          <h2>الفريق</h2>
          <span className="admin-subtle">
            اضغط على بطاقة لعرض محادثات هذا الموظف فقط
          </span>
        </div>
        <div className="team-grid">
          <Link
            href="/admin"
            className={`team-card team-card-all ${
              selectedUserId ? '' : 'team-card-active'
            }`}
          >
            <div className="team-avatar team-avatar-all">∑</div>
            <div className="team-card-body">
              <div className="team-card-name">الكل</div>
              <div className="team-card-meta">
                {allThreads.length} محادثة
              </div>
            </div>
          </Link>

          {userCards.map((u) => {
            const active = u.lastActivity && isActiveToday(u.lastActivity);
            const selected = selectedUserId === u.id;
            return (
              <Link
                key={u.id}
                href={`/admin?user=${u.id}`}
                className={`team-card ${selected ? 'team-card-active' : ''}`}
              >
                <div className="team-avatar">
                  {initial(u.full_name, u.email)}
                  {active && <span className="team-active-dot" aria-hidden />}
                </div>
                <div className="team-card-body">
                  <div className="team-card-name-row">
                    <span className="team-card-name">
                      {u.full_name ?? u.email}
                    </span>
                    <span className={`role-badge role-${u.role}`}>
                      {u.role === 'admin' ? 'أدمن' : 'مبيعات'}
                    </span>
                  </div>
                  <div className="team-card-meta">
                    {u.count} محادثة · {relativeTime(u.lastActivity)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="admin-table-wrap">
        <div className="admin-table-header">
          <h2>
            {selectedUser
              ? `محادثات ${selectedUser.full_name ?? selectedUser.email}`
              : 'المحادثات'}
          </h2>
          <span className="admin-subtle">
            {threadsError
              ? `فشل تحميل المحادثات: ${threadsError}`
              : `تعرض ${visibleThreads.length} محادثة (الحد الأقصى 100)`}
          </span>
        </div>
        {visibleThreads.length === 0 && !threadsError ? (
          <div className="admin-empty">
            {selectedUser
              ? 'لا توجد محادثات لهذا الموظف بعد.'
              : 'لا توجد محادثات فعلية بعد. ابدأ محادثة من الصفحة الرئيسية.'}
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
                {visibleThreads.map((t) => {
                  const userId = parseUserId(t.user);
                  const u = userId ? userMap.get(userId) : undefined;
                  return (
                    <tr key={t.id}>
                      <td>{formatDate(t.created_at)}</td>
                      <td>{u?.full_name ?? '—'}</td>
                      <td className="admin-email">{u?.email ?? t.user}</td>
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
