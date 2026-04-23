import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Best-effort in-memory rate limit per warm serverless instance.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 100;
const requestLog = new Map<string, number[]>();

function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (recent.length >= RATE_LIMIT_MAX) return true;
  recent.push(now);
  requestLog.set(ip, recent);

  if (Math.random() < 0.01) {
    for (const [key, times] of requestLog.entries()) {
      const fresh = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) requestLog.delete(key);
      else requestLog.set(key, fresh);
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

function slugify(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9؀-ۿ]+/g, '_').toLowerCase();
  return cleaned || 'anon';
}

type ChatKitSession = { client_secret: string };

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const ip = clientIp(request);
  if (rateLimited(ip)) {
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

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ertqa_user')?.value;
  let userName = 'anon';
  if (userCookie) {
    try {
      userName = decodeURIComponent(userCookie);
    } catch {
      // malformed cookie
    }
  }
  const userId = `ertqa_${slugify(userName)}`;

  const response = await fetch('https://api.openai.com/v1/chatkit/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'chatkit_beta=v1',
    },
    body: JSON.stringify({
      workflow: { id: workflowId },
      user: userId,
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
