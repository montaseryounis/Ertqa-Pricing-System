import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';
import { listThreads } from '@/lib/openai';
import CleanupForm from './CleanupForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'تنظيف المحادثات · ارتقاء',
};

export default async function CleanupPage() {
  const supabase = createAdminClient();

  const { count: rowCount } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true });

  let threadCount = 0;
  let threadHasMore = false;
  try {
    const res = await listThreads({ limit: 100 });
    threadCount = res.data.length;
    threadHasMore = res.has_more;
  } catch {
    threadCount = 0;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-title">
          <h1>🗑️ تنظيف المحادثات</h1>
        </div>
        <div className="admin-header-actions">
          <Link href="/admin" className="admin-link">
            → لوحة الأدمن
          </Link>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <CleanupForm
        threadCount={threadCount}
        threadHasMore={threadHasMore}
        rowCount={rowCount ?? 0}
      />
    </main>
  );
}
