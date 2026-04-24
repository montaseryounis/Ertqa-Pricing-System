import Link from 'next/link';
import { notFound } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { createAdminClient } from '@/lib/supabase';
import {
  getThread,
  listThreadItems,
  parseUserId,
  type ThreadItem,
} from '@/lib/openai';

export const dynamic = 'force-dynamic';

function formatDateTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString('ar-SA', {
    timeStyle: 'short',
  });
}

function Attachment({ name }: { name: string }) {
  return <span className="attachment-chip">📎 {name}</span>;
}

function MessageBubble({ item }: { item: ThreadItem }) {
  if (item.type === 'chatkit.user_message') {
    const userItem = item as Extract<
      ThreadItem,
      { type: 'chatkit.user_message' }
    >;
    return (
      <div className="msg msg-user">
        <div className="msg-meta">
          <span className="msg-label">الموظف</span>
          <span className="msg-time">{formatTime(userItem.created_at)}</span>
        </div>
        <div className="msg-body">
          {userItem.content?.map((c, i) => {
            if (c.type === 'input_text') {
              return (
                <p key={i} className="msg-text">
                  {c.text}
                </p>
              );
            }
            if (c.type === 'quoted_text') {
              return (
                <blockquote key={i} className="msg-quote">
                  {c.text}
                </blockquote>
              );
            }
            return null;
          })}
          {userItem.attachments?.length > 0 && (
            <div className="msg-attachments">
              {userItem.attachments.map((a) => (
                <Attachment key={a.id} name={a.name} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (item.type === 'chatkit.assistant_message') {
    const asstItem = item as Extract<
      ThreadItem,
      { type: 'chatkit.assistant_message' }
    >;
    return (
      <div className="msg msg-assistant">
        <div className="msg-meta">
          <span className="msg-label">الوكيل</span>
          <span className="msg-time">{formatTime(asstItem.created_at)}</span>
        </div>
        <div className="msg-body">
          {asstItem.content?.map((c, i) =>
            c.type === 'output_text' ? (
              <p key={i} className="msg-text">
                {c.text}
              </p>
            ) : null
          )}
        </div>
      </div>
    );
  }

  if (item.type === 'chatkit.widget') {
    const widgetItem = item as Extract<ThreadItem, { type: 'chatkit.widget' }>;
    return (
      <div className="msg msg-widget">
        <div className="msg-meta">
          <span className="msg-label">مكوّن تفاعلي (تسعيرة / بطاقة)</span>
          <span className="msg-time">{formatTime(widgetItem.created_at)}</span>
        </div>
        <details className="msg-body widget-details">
          <summary>عرض محتوى الويجت (JSON)</summary>
          <pre className="widget-json">
            {(() => {
              try {
                return JSON.stringify(JSON.parse(widgetItem.widget), null, 2);
              } catch {
                return widgetItem.widget;
              }
            })()}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="msg msg-other">
      <div className="msg-meta">
        <span className="msg-label">{item.type}</span>
        <span className="msg-time">{formatTime(item.created_at)}</span>
      </div>
    </div>
  );
}

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;

  let thread;
  try {
    thread = await getThread(threadId);
  } catch {
    notFound();
  }

  const itemsRes = await listThreadItems(threadId, {
    order: 'asc',
    limit: 100,
  });
  const items = itemsRes.data;

  const userId = parseUserId(thread.user);
  let user: {
    email: string;
    full_name: string | null;
    role: string;
  } | null = null;
  if (userId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('users')
      .select('email, full_name, role')
      .eq('id', userId)
      .maybeSingle();
    user = data as typeof user;
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div className="admin-title">
          <Link href="/admin" className="admin-link">
            → لوحة الأدمن
          </Link>
        </div>
        <div className="admin-header-actions">
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </header>

      <section className="thread-meta">
        <h1 className="thread-title">{thread.title ?? 'محادثة بدون عنوان'}</h1>
        <div className="thread-meta-grid">
          <div>
            <span className="thread-meta-label">الموظف</span>
            <span className="thread-meta-value">{user?.full_name ?? '—'}</span>
          </div>
          <div>
            <span className="thread-meta-label">الإيميل</span>
            <span className="thread-meta-value admin-email">
              {user?.email ?? thread.user}
            </span>
          </div>
          <div>
            <span className="thread-meta-label">التاريخ</span>
            <span className="thread-meta-value">
              {formatDateTime(thread.created_at)}
            </span>
          </div>
          <div>
            <span className="thread-meta-label">عدد الرسائل</span>
            <span className="thread-meta-value">{items.length}</span>
          </div>
        </div>
      </section>

      <section className="messages" aria-label="الرسائل">
        {items.length === 0 ? (
          <div className="admin-empty">لا توجد رسائل في هذه المحادثة.</div>
        ) : (
          items.map((item) => <MessageBubble key={item.id} item={item} />)
        )}
      </section>
    </main>
  );
}
