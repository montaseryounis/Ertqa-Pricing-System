'use server';

import { isAdminUser } from '@/lib/admin';
import { createAdminClient } from '@/lib/supabase';
import { deleteThread, listThreads } from '@/lib/openai';

export type CleanupResult = {
  ok: boolean;
  error?: string;
  threadsDeleted?: number;
  threadsFailed?: number;
  rowsDeleted?: number;
};

const REQUIRED_CONFIRMATION = 'حذف الكل';
const BATCH_SIZE = 10;
const MAX_PAGES = 50; // safety limit: 50 * 100 = 5000 threads

export async function deleteAllConversations(
  confirmation: string
): Promise<CleanupResult> {
  if (confirmation.trim() !== REQUIRED_CONFIRMATION) {
    return { ok: false, error: 'التأكيد غير صحيح' };
  }

  if (!(await isAdminUser())) {
    return { ok: false, error: 'غير مصرح — الأدمن فقط' };
  }

  let threadsDeleted = 0;
  let threadsFailed = 0;

  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await listThreads({ limit: 100, order: 'desc' });
      if (res.data.length === 0) break;

      for (let i = 0; i < res.data.length; i += BATCH_SIZE) {
        const batch = res.data.slice(i, i + BATCH_SIZE);
        const results = await Promise.allSettled(
          batch.map((t) => deleteThread(t.id))
        );
        for (const r of results) {
          if (r.status === 'fulfilled') threadsDeleted++;
          else threadsFailed++;
        }
      }

      // After deletion the cursor is unreliable; just refetch from the
      // top until listThreads returns an empty page.
      if (!res.has_more && res.data.length < 100) break;
    }
  } catch (error) {
    return {
      ok: false,
      error: `فشل حذف محادثات OpenAI: ${
        error instanceof Error ? error.message : String(error)
      }`,
      threadsDeleted,
      threadsFailed,
    };
  }

  // Wipe the local conversations log. The .gte() filter matches every
  // row because all started_at values are after the epoch.
  let rowsDeleted = 0;
  try {
    const supabase = createAdminClient();
    const { error: dbError, count } = await supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .gte('started_at', '1970-01-01');
    if (dbError) {
      return {
        ok: false,
        error: `حذف OpenAI نجح لكن فشل حذف Supabase: ${dbError.message}`,
        threadsDeleted,
        threadsFailed,
      };
    }
    rowsDeleted = count ?? 0;
  } catch (error) {
    return {
      ok: false,
      error: `فشل الاتصال بـ Supabase: ${
        error instanceof Error ? error.message : String(error)
      }`,
      threadsDeleted,
      threadsFailed,
    };
  }

  return {
    ok: true,
    threadsDeleted,
    threadsFailed,
    rowsDeleted,
  };
}
