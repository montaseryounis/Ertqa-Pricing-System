import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';
import { listThreads, parseUserId, type ThreadSummary } from '@/lib/openai';
import TeamCard from './TeamCard';
import ConversationsTable, {
  type ConversationRow,
} from './ConversationsTable';
import StatCards, {
  type ConversationLite,
  type DailyBucket,
  type EmployeeRow,
} from './StatCards';

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
  user_email: string | null;
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

function formatDateOnly(date: Date): string {
  return date.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
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

function startOfDayDate(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
}

function startOfDayIso(offsetDays = 0): string {
  return startOfDayDate(offsetDays).toISOString();
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

async function fetchRecentConversations(
  supabase: ReturnType<typeof createAdminClient>
): Promise<ConvRow[]> {
  const since = new Date(Date.now() - 90 * 86400 * 1000).toISOString();

  const withRef = await supabase
    .from('conversations')
    .select(
      'user_id, user_email, started_at, customer_name, quote_reference, session_id'
    )
    .gte('started_at', since)
    .order('started_at', { ascending: false });

  if (!withRef.error) return (withRef.data ?? []) as ConvRow[];

  const legacy = await supabase
    .from('conversations')
    .select('user_id, user_email, started_at, customer_name, session_id')
    .gte('started_at', since)
    .order('started_at', { ascending: false });
  if (legacy.error) return [];
  type LegacyRow = Omit<ConvRow, 'quote_reference'>;
  return (legacy.data as LegacyRow[]).map((c) => ({
    ...c,
    quote_reference: null,
  }));
}

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
  let bestDiff = 10 * 60 * 1000;
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

function findThreadIdForConversation(
  conv: ConvRow,
  threadsByUser: Map<string, ThreadSummary[]>
): string | null {
  const list = threadsByUser.get(conv.user_id);
  if (!list) return null;
  const cMs = new Date(conv.started_at).getTime();
  let best: ThreadSummary | null = null;
  let bestDiff = 10 * 60 * 1000;
  for (const t of list) {
    const diff = Math.abs(t.created_at * 1000 - cMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = t;
    }
  }
  return best?.id ?? null;
}

function bucketDailyCounts(rows: ConvRow[], days: number): DailyBucket[] {
  const start = startOfDayDate(days - 1);
  const buckets = new Array(days).fill(0);
  const startMs = start.getTime();
  for (const r of rows) {
    const ms = new Date(r.started_at).getTime();
    if (ms < startMs) continue;
    const dayDate = new Date(ms);
    dayDate.setHours(0, 0, 0, 0);
    const offset = Math.floor((dayDate.getTime() - startMs) / 86400000);
    if (offset >= 0 && offset < days) buckets[offset]++;
  }
  return buckets.map((count, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { dateLabel: formatDateOnly(d), count };
  });
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

  const allConversations = await fetchRecentConversations(supabase);

  const convsByUser = new Map<string, ConvRow[]>();
  for (const c of allConversations) {
    const list = convsByUser.get(c.user_id);
    if (list) list.push(c);
    else convsByUser.set(c.user_id, [c]);
  }

  const tableRows: ConversationRow[] = visibleThreads.map((t) => {
    const userId = parseUserId(t.user);
    const u = userId ? userMap.get(userId) : undefined;
    const conv = matchConversation(t.user, t.created_at, convsByUser);
    return {
      threadId: t.id,
      dateLabel: formatDate(t.created_at),
      employeeName: u?.full_name ?? '—',
      customerName: conv?.customer_name ?? '—',
      quoteRef: conv?.quote_reference ?? '—',
      title: t.title ?? '—',
      statusLabel: statusLabel(t.status),
      statusType: t.status.type,
    };
  });

  const tableHeading = selectedUser
    ? `محادثات ${selectedUser.full_name ?? selectedUser.email}`
    : 'المحادثات';
  const emptyMessage = selectedUser
    ? 'لا توجد محادثات لهذا الموظف بعد.'
    : 'لا توجد محادثات فعلية بعد. ابدأ محادثة من الصفحة الرئيسية.';

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

  const dailyCounts30 = bucketDailyCounts(allConversations, 30);
  const dailyCounts7 = bucketDailyCounts(allConversations, 7);

  const sevenDaysAgoMs = startOfDayDate(6).getTime();
  const todayMs = startOfDayDate(0).getTime();

  const employeesForModal: EmployeeRow[] = userCards.map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    imageUrl: u.image_url,
    role: u.role,
    count: u.count,
    lastActivityLabel: relativeTime(u.lastActivity),
  }));

  const buildLite = (c: ConvRow): ConversationLite => {
    const u = userMap.get(c.user_id);
    return {
      threadId: findThreadIdForConversation(c, threadsByUser),
      dateLabel: new Date(c.started_at).toLocaleString('ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
      employeeName: u?.full_name ?? c.user_email ?? '—',
      customerName: c.customer_name ?? '—',
      quoteRef: c.quote_reference ?? '—',
    };
  };

  const todayList: ConversationLite[] = allConversations
    .filter((c) => new Date(c.started_at).getTime() >= todayMs)
    .map(buildLite);

  const weekList: ConversationLite[] = allConversations
    .filter((c) => new Date(c.started_at).getTime() >= sevenDaysAgoMs)
    .map(buildLite);

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

      <StatCards
        totalCount={totalConversations ?? 0}
        employeeCount={uniqueUsers ?? 0}
        weekCount={weekCount ?? 0}
        todayCount={todayCount ?? 0}
        dailyCounts30={dailyCounts30}
        dailyCounts7={dailyCounts7}
        employees={employeesForModal}
        todayList={todayList}
        weekList={weekList}
      />

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

      <ConversationsTable
        rows={tableRows}
        heading={tableHeading}
        emptyMessage={emptyMessage}
        errorMessage={
          threadsError ? `فشل تحميل المحادثات: ${threadsError}` : null
        }
      />
    </main>
  );
}
