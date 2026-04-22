import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ChatKitSession = {
  client_secret: string;
};

export async function POST(request: Request) {
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
