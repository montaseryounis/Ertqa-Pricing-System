import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Best-effort in-memory rate limit per warm serverless instance.
// For stricter guarantees across instances, swap for Upstash Redis later.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 20;
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

  // Probabilistic cleanup to keep the map bounded.
  if (Math.random() < 0.01) {
    for (const [key, times] of requestLog.entries()) {
      const fresh = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) requestLog.delete(key);
      else requestLog.set(key, fresh);
    }
  }

  return false;
}

// CSRF protection: reject requests whose Origin doesn't match the serving host.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-site navigations may omit Origin
  const host = request.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type ChatKitSession = {
  client_secret: string;
};

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden origin' }, { status: 403 });
  }

  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json(
      {
        error:
          'Too many requests. Please wait a few minutes before trying again.',
      },
      { status: 429, headers: { 'Retry-After': '600' } }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.CHATKIT_WORKFLOW_ID;

  if (!apiKey || !workflowId) {
    return NextResponse.json(
      {
        error:
          'Missing OPENAI_API_KEY or CHATKIT_WORKFLOW_ID. Set them in .env.local.',
      },
      { status: 500 }
    );
  }

  let deviceId: string | undefined;
  try {
    const body = await request.json();
    if (typeof body?.deviceId === 'string') {
      deviceId = body.deviceId;
    }
  } catch {
    // empty body is acceptable
  }

  const userId = deviceId ?? `anon_${crypto.randomUUID()}`;

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
