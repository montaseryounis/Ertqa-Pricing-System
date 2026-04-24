import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function startOfDay(offsetDays = 0): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d.toISOString();
}

export default async function AdminPage() {
  const supabase = createAdminClient();

  const { data: conversations } = await supabase
    .from('conversations')
    .select(
      'id, user_id, user_email, customer_name, workflow_id, session_id, started_at'
    )
    .order('started_at', { ascending: false })
    .limit(200);

  const rows = conversations ?? [];

  const userIds = Array.from(new Set(rows.map((c) => c.user_id)));
  const { data: users } = userIds.length
    ? await supabase
        .from('users')
        .select('id, full_name, role')
        .in('id', userIds)
    : { data: [] };
  const userMap = new Map(
    (users ?? []).map((u: { id: string; full_name: string | null; role: string }) => [
      u.id,
      { name: u.full_name, role: u.role },
    ])
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
      .gte('started_at', startOfDay(0)),
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .gte('started_at', startOfDay(6)),
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
          <Link href="/" className="admin-link">→ العودة للوكيل</Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <section className="admin-stats" aria-label="إحصائيات">
        <div className="stat">
          <div className="stat-value">{totalConversations ?? 0}</div>
          <div className="stat-label">إجمالي المحادثات</div>
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
          <h2>آخر المحادثات</h2>
          <span className="admin-subtle">
            تعرض {rows.length} محادثة (الحد الأقصى 200)
          </span>
        </div>
        {rows.length === 0 ? (
          <div className="admin-empty">
            لا توجد محادثات بعد. ابدأ محادثة من الصفحة الرئيسية لتظهر هنا.
          </div>
        ) : (
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>الموظف</th>
                  <th>الإيميل</th>
                  <th>الدور</th>
                  <th>العميل</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const info = userMap.get(c.user_id);
                  return (
                    <tr key={c.id}>
                      <td>{formatDate(c.started_at)}</td>
                      <td>{info?.name ?? '—'}</td>
                      <td className="admin-email">{c.user_email}</td>
                      <td>
                        <span
                          className={`role-badge role-${info?.role ?? 'sales'}`}
                        >
                          {info?.role === 'admin' ? 'أدمن' : 'مبيعات'}
                        </span>
                      </td>
                      <td>{c.customer_name ?? '—'}</td>
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
