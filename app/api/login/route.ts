import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE,
  USER_COOKIE,
  COOKIE_MAX_AGE,
  createAuthToken,
} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DISPLAY_NAME = 'ErtqaAgent';

export async function POST(request: Request) {
  const teamPassword = process.env.TEAM_PASSWORD;
  const authSecret = process.env.AUTH_SECRET;

  if (!teamPassword || !authSecret) {
    return NextResponse.json(
      { error: 'الخادم غير مهيّأ. اتصل بالمسؤول.' },
      { status: 500 }
    );
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'طلب غير صالح' }, { status: 400 });
  }

  const { password } = body;

  if (!password) {
    return NextResponse.json(
      { error: 'كلمة السر مطلوبة' },
      { status: 400 }
    );
  }

  if (password !== teamPassword) {
    return NextResponse.json(
      { error: 'كلمة السر غير صحيحة' },
      { status: 401 }
    );
  }

  const token = await createAuthToken(authSecret);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  response.cookies.set(USER_COOKIE, encodeURIComponent(DISPLAY_NAME), {
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });

  return response;
}
