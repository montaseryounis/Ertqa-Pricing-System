import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';
import { listThreads, parseUserId, type ThreadSummary } from '@/lib/openai';
import AnimatedNumber from './AnimatedNumber';
import TeamCard from './TeamCard';
import InteractiveSurface from '@/components/InteractiveSurface';

export const dynamic = 'force-dynamic';

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  role: string;
};

type UserCardData = UserRow & {
  count: number;
  lastActivity: number | undefined;
  spark: number[];
};

type ConvRow = {
  user_id: string;
  started_at: string;
  customer_name: string | null;
  quote_reference: string | null;
  session_id: string | null;
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

function computeSparkline(threads: ThreadSummary[]): number[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const buckets = new Array(7).fill(0);
  for (const t of threads) {
    const d = new Date(t.created_at * 1000);
    d.setHours(0, 0, 0, 0);
    const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (daysAgo >= 0 && daysAgo < 7) {
      buckets[6 - daysAgo]++;
    }
  }
  return buckets;
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(1, ...data);
  const barWidth = 7;
  const gap = 3;
  const chartHeight = 18;
  return (
    <svg
      viewBox={`0 0 ${data.length * (barWidth + gap)} ${chartHeight}`}
      className="sparkline"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      {data.map((value, i) => {
        const h = max > 0 ? (value / max) * (chartHeight - 2) : 0;
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={chartHeight - Math.max(h, 2)}
            width={barWidth}
            height={Math.max(h, 2)}
            rx={1.5}
            className="sparkline-bar"
            opacity={value === 0 ? 0.25 : 0.9}
          />
        );
      })}
    </svg>
  );
}

async function fetchUsers(
  supabase: ReturnType<typeof createAdminClient>
): Promise<UserRow[]> {
  const withImage = await supabase
    .from('users')
    .select('id, email, full_name, image_url, role');
  if (!withImage.error) {
    return (withImage.data ?? []) as UserRow[];
  }

  const legacy = await supabase
    .from('users')
    .select('id, email, full_name, role');
  if (legacy.error) return [];
  type LegacyRow = Omit<UserRow, 'image_url'>;
  return (legacy.data as LegacyRow[]).map((u) => ({ ...u, image_url: null }));
}

// Fetch recent conversations and tolerate the case where quote_reference
// hasn't been added yet.
async function fetchRecentConversations(
  supabase: ReturnType<typeof createAdminClient>,
  userIds: string[]
): Promise<ConvRow[]> {
  if (userIds.length === 0) return [];
  const since = new Date(Date.now() - 90 * 86400 * 1000).toISOString();

  const withRef = await supabase
    .from('conversations')
    .select('user_id, started_at, customer_name, quote_reference, session_id')
    .in('user_id', userIds)
    .gte('started_at', since)
    .order('started_at', { ascending: false });

  if (!withRef.error) return (withRef.data ?? []) as ConvRow[];

  const legacy = await supabase
    .from('conversations')
    .select('user_id, started_at, customer_name, session_id')
    .in('user_id', userIds)
    .gte('started_at', since)
    .order('started_at', { ascending: false });
  if (legacy.error) return [];
  type LegacyRow = Omit<ConvRow, 'quote_reference'>;
  return (legacy.data as LegacyRow[]).map((c) => ({
    ...c,
    quote_reference: null,
  }));
}

// Match a thread to the closest conversation row for the same user
// (within ~10 minutes, since the first thread is created shortly
// after the session). Returns null if no plausible match.
function matchConversation(
  threadUser: string,
  threadCreatedAt: number,
  convsByUser: Map<string, ConvRow[]>
): ConvRow | null {
  const userId = parseUserId(threadUser);
  if (!userId) return null;
  const list = convsByUser.get(userId);
  if (!list || list.length === 0) return null;

  const threadMs = threadCreatedAt * 1000;
  let best: ConvRow | null = null;
  let bestDiff = 10 * 60 * 1000; // 10 min window
  for (const c of list) {
    const cMs = new Date(c.started_at).getTime();
    const diff = Math.abs(threadMs - cMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = c;
    }
  }
  return best;
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

  const users = await fetchUsers(supabase);

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
        spark: computeSparkline(userThreads),
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

  // Pull conversation rows for every user that owns a visible thread,
  // then bucket them so matchConversation() is O(1) lookup per thread.
  const visibleUserIds = Array.from(
    new Set(
      visibleThreads
        .map((t) => parseUserId(t.user))
        .filter((id): id is string => Boolean(id))
    )
  );
  const conversations = await fetchRecentConversations(supabase, visibleUserIds);
  const convsByUser = new Map<string, ConvRow[]>();
  for (const c of conversations) {
    const list = convsByUser.get(c.user_id);
    if (list) list.push(c);
    else convsByUser.set(c.user_id, [c]);
  }

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
        <InteractiveSurface className="stat" tilt={5}>
          <div className="stat-value">
            <AnimatedNumber value={totalConversations ?? 0} />
          </div>
          <div className="stat-label">إجمالي الجلسات</div>
        </InteractiveSurface>
        <InteractiveSurface className="stat" tilt={5}>
          <div className="stat-value">
            <AnimatedNumber value={uniqueUsers ?? 0} />
          </div>
          <div className="stat-label">الموظفون</div>
        </InteractiveSurface>
        <InteractiveSurface className="stat" tilt={5}>
          <div className="stat-value">
            <AnimatedNumber value={weekCount ?? 0} />
          </div>
          <div className="stat-label">آخر 7 أيام</div>
        </InteractiveSurface>
        <InteractiveSurface className="stat" tilt={5}>
          <div className="stat-value">
            <AnimatedNumber value={todayCount ?? 0} />
          </div>
          <div className="stat-label">اليوم</div>
        </InteractiveSurface>
      </section>

      <section className="team-section" aria-label="الفريق">
        <div className="team-section-header">
          <h2>الفريق</h2>
          <span className="admin-subtle">
            اضغط على بطاقة لعرض محادثات هذا الموظف فقط
          </span>
        </div>
        <div className="team-grid">
          <TeamCard
            href="/admin"
            className="team-card-all"
            isActive={!selectedUserId}
          >
            <div className="team-avatar team-avatar-all">∑</div>
            <div className="team-card-body">
              <div className="team-card-name">الكل</div>
              <div className="team-card-meta">
                {allThreads.length} محادثة
              </div>
            </div>
          </TeamCard>

          {userCards.map((u) => {
            const active = u.lastActivity && isActiveToday(u.lastActivity);
            const selected = selectedUserId === u.id;
            return (
              <TeamCard
                key={u.id}
                href={`/admin?user=${u.id}`}
                isActive={selected}
              >
                <div className="team-avatar">
                  {u.image_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={u.image_url}
                      alt={u.full_name ?? u.email}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="team-avatar-initial">
                      {initial(u.full_name, u.email)}
                    </span>
                  )}
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
                  <Sparkline data={u.spark} />
                </div>
              </TeamCard>
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
                  <th>العميل</th>
                  <th>رقم العرض</th>
                  <th>العنوان</th>
                  <th>الحالة</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visibleThreads.map((t) => {
                  const userId = parseUserId(t.user);
                  const u = userId ? userMap.get(userId) : undefined;
                  const conv = matchConversation(
                    t.user,
                    t.created_at,
                    convsByUser
                  );
                  return (
                    <tr key={t.id}>
                      <td>{formatDate(t.created_at)}</td>
                      <td>{u?.full_name ?? '—'}</td>
                      <td>{conv?.customer_name ?? '—'}</td>
                      <td className="quote-ref-cell">
                        {conv?.quote_reference ?? '—'}
                      </td>
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
