// Server-only helpers for OpenAI's ChatKit REST API. The types mirror
// the openai SDK's @6.x definitions; we use fetch directly to stay light.

const OPENAI_BASE = 'https://api.openai.com/v1/chatkit';

function authHeaders(): HeadersInit {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY');
  return {
    Authorization: `Bearer ${apiKey}`,
    'OpenAI-Beta': 'chatkit_beta=v1',
    'Content-Type': 'application/json',
  };
}

export type ThreadStatus =
  | { type: 'active' }
  | { type: 'locked'; reason?: string | null }
  | { type: 'closed'; reason?: string | null };

export type ThreadSummary = {
  id: string;
  object: 'chatkit.thread';
  created_at: number;
  status: ThreadStatus;
  title: string | null;
  user: string;
};

export type ThreadListResponse = {
  data: ThreadSummary[];
  has_more: boolean;
  last_id: string | null;
  first_id: string | null;
  object: 'list';
};

export async function listThreads(params?: {
  limit?: number;
  after?: string;
  user?: string;
  order?: 'asc' | 'desc';
}): Promise<ThreadListResponse> {
  const url = new URL(`${OPENAI_BASE}/threads`);
  if (params?.limit) url.searchParams.set('limit', String(params.limit));
  if (params?.after) url.searchParams.set('after', params.after);
  if (params?.user) url.searchParams.set('user', params.user);
  if (params?.order) url.searchParams.set('order', params.order);

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`listThreads ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function getThread(threadId: string): Promise<ThreadSummary> {
  const res = await fetch(`${OPENAI_BASE}/threads/${threadId}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`getThread ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

export async function deleteThread(threadId: string): Promise<boolean> {
  const res = await fetch(`${OPENAI_BASE}/threads/${threadId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  // 404 = already gone; treat as success so retries are idempotent.
  if (res.status === 404) return true;
  if (!res.ok) {
    throw new Error(`deleteThread ${res.status}: ${await res.text()}`);
  }
  return true;
}

export type Attachment = {
  id: string;
  name: string;
  mime_type?: string;
  type?: string;
};

export type UserMessageItem = {
  id: string;
  object: 'chatkit.thread_item';
  thread_id: string;
  type: 'chatkit.user_message';
  created_at: number;
  content: Array<
    | { type: 'input_text'; text: string }
    | { type: 'quoted_text'; text: string }
  >;
  attachments: Attachment[];
};

export type AssistantMessageItem = {
  id: string;
  object: 'chatkit.thread_item';
  thread_id: string;
  type: 'chatkit.assistant_message';
  created_at: number;
  content: Array<{ type: 'output_text'; text: string }>;
};

export type WidgetItem = {
  id: string;
  object: 'chatkit.thread_item';
  thread_id: string;
  type: 'chatkit.widget';
  created_at: number;
  widget: string;
};

export type GenericItem = {
  id: string;
  object: 'chatkit.thread_item';
  thread_id: string;
  type: string;
  created_at: number;
  [key: string]: unknown;
};

export type ThreadItem =
  | UserMessageItem
  | AssistantMessageItem
  | WidgetItem
  | GenericItem;

export type ThreadItemsResponse = {
  data: ThreadItem[];
  has_more: boolean;
  last_id: string | null;
  first_id: string | null;
  object: 'list';
};

export async function listThreadItems(
  threadId: string,
  params?: { order?: 'asc' | 'desc'; limit?: number; after?: string }
): Promise<ThreadItemsResponse> {
  const url = new URL(`${OPENAI_BASE}/threads/${threadId}/items`);
  url.searchParams.set('order', params?.order ?? 'asc');
  url.searchParams.set('limit', String(params?.limit ?? 100));
  if (params?.after) url.searchParams.set('after', params.after);

  const res = await fetch(url.toString(), {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) {
    throw new Error(`listThreadItems ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Thread users are stored as `ertqa_${clerkUserId}` when created from our
// session route. Strip the prefix to look up the row in public.users.
export function parseUserId(threadUser: string): string | null {
  if (!threadUser) return null;
  if (!threadUser.startsWith('ertqa_')) return null;
  return threadUser.slice('ertqa_'.length);
}
