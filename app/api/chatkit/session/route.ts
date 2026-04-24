import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

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

type ChatKitSession = { client_secret: string };

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

  const session = (await response.json()) as ChatKitSession;
  return NextResponse.json({ client_secret: session.client_secret });
}
