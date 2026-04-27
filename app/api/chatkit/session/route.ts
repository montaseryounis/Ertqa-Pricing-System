import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { createAdminClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 100;
const requestLog = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  requestLog.set(key, recent);

  if (Math.random() < 0.01) {
    for (const [k, times] of requestLog.entries()) {
      const fresh = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) requestLog.delete(k);
      else requestLog.set(k, fresh);
    }
  }

  return false;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type ChatKitSessionResponse = {
  id?: string;
  client_secret: string;
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (rateLimited(userId)) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes.' },
      { status: 429, headers: { 'Retry-After': '600' } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.CHATKIT_WORKFLOW_ID;
  if (!apiKey || !workflowId) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY or CHATKIT_WORKFLOW_ID.' },
      { status: 500 }
    );
  }

  const user = await currentUser();
  const email =
    user?.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    null;
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') || null;
  const imageUrl = user?.imageUrl ?? null;
  const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'sales';

  let customerName: string | null = null;
  let quoteRef: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.customerName === 'string') {
      customerName = body.customerName.trim().slice(0, 200) || null;
    }
    if (typeof body?.quoteRef === 'string') {
      quoteRef = body.quoteRef.trim().slice(0, 100) || null;
    }
  } catch {
    // empty body is acceptable
  }

  const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'chatkit_beta=v1',
    },
    body: JSON.stringify({
      workflow: { id: workflowId },
      user: `ertqa_${userId}`,
      chatkit_configuration: {
        file_upload: {
          enabled: true,
          max_files: 5,
          max_file_size: 10,
        },
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `ChatKit session creation failed: ${errorText}` },
      { status: response.status }
    );
  }

  const session = (await response.json()) as ChatKitSessionResponse;

  if (email) {
    try {
      const supabase = createAdminClient();
      await Promise.allSettled([
        supabase.from('users').upsert(
          {
            id: userId,
            email,
            full_name: fullName,
            image_url: imageUrl,
            role,
          },
          { onConflict: 'id' }
        ),
        supabase.from('conversations').insert({
          user_id: userId,
          user_email: email,
          session_id: session.id ?? null,
          workflow_id: workflowId,
          customer_name: customerName,
          quote_reference: quoteRef,
        }),
      ]);
    } catch (error) {
      console.error('[chatkit/session] supabase logging failed', error);
    }
  }

  return NextResponse.json({ client_secret: session.client_secret });
}
